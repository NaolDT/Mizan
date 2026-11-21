import { Prisma, type SubscriptionPlan } from "@prisma/client";
import type {
  BillingProviderCode,
  CheckoutResponse,
  PaymentStatusDto,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { ensureBillingCatalog, getPlanConfig } from "./catalog.js";
import { addOneEatMonth, grantCreditLotOn } from "./credit.service.js";
import { assertProvider, initiateProvider, verifyProvider } from "./payment.providers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function money(value: Prisma.Decimal | number): number {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toNumber();
}

function discounted(price: Prisma.Decimal, pct: number): Prisma.Decimal {
  if (pct <= 0) return price.toDecimalPlaces(2);
  const keep = new Prisma.Decimal(100 - pct).div(100);
  return price.mul(keep).toDecimalPlaces(2);
}

function toDto(payment: {
  txRef: string;
  status: PaymentStatusDto["status"];
  purpose: PaymentStatusDto["purpose"];
  amount: Prisma.Decimal;
  creditsToGrant: number;
  provider: PaymentStatusDto["provider"];
  title: string;
  fulfilledAt: Date | null;
}): PaymentStatusDto {
  return {
    txRef: payment.txRef,
    status: payment.status,
    purpose: payment.purpose,
    amountEtb: money(payment.amount),
    credits: payment.creditsToGrant,
    provider: payment.provider,
    title: payment.title,
    fulfilled: payment.fulfilledAt != null,
  };
}

export async function startCheckout(input: {
  businessId: string;
  userId: string;
  purpose: "SUBSCRIPTION" | "TOPUP";
  provider: BillingProviderCode;
  plan?: SubscriptionPlan;
  packageCode?: string;
}): Promise<CheckoutResponse> {
  await ensureBillingCatalog();
  assertProvider(input.provider);

  const business = await prisma.business.findUnique({ where: { id: input.businessId } });
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!business || !user) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

  let amount = new Prisma.Decimal(0);
  let credits = 0;
  let validityDays = 30;
  let title = "";
  let plan: SubscriptionPlan | null = null;
  let packageCode: string | null = null;

  if (input.purpose === "SUBSCRIPTION") {
    if (!input.plan || input.plan === "FREE") {
      throw new AppError(400, "PLAN_REQUIRED", "Choose a paid plan. The free plan does not need a payment.");
    }
    const config = await getPlanConfig(input.plan);
    if (!config.active || config.priceEtb.lte(0)) {
      throw new AppError(400, "PLAN_UNAVAILABLE", "That plan is not available for purchase.");
    }
    amount = discounted(config.priceEtb, business.nextBillDiscountPct);
    credits = config.monthlyCredits;
    title = `${config.name} monthly plan`;
    plan = input.plan;
  } else {
    const pack = await prisma.topUpPackage.findUnique({ where: { code: input.packageCode ?? "" } });
    if (!pack || !pack.active || pack.priceEtb.lte(0)) {
      throw new AppError(404, "PACKAGE_NOT_FOUND", "That top-up is not available.");
    }
    amount = pack.priceEtb.toDecimalPlaces(2);
    credits = pack.credits + pack.bonusCredits;
    validityDays = pack.validityDays;
    packageCode = pack.code;
    title = pack.name;
  }

  if (credits <= 0) {
    throw new AppError(400, "PACKAGE_MISCONFIGURED", "This offer has no AI credits. Contact Mizan.");
  }

  const txRef = `mz${crypto.randomUUID().replace(/-/g, "")}`;
  const payment = await prisma.billingPayment.create({
    data: {
      businessId: input.businessId,
      userId: input.userId,
      purpose: input.purpose,
      provider: input.provider,
      plan,
      packageCode,
      title,
      amount,
      currency: "ETB",
      creditsToGrant: credits,
      validityDays,
      txRef,
    },
  });

  try {
    const started = await initiateProvider(payment, {
      email: user.email,
      name: user.name,
      phone: user.phone,
    });
    await prisma.billingPayment.update({
      where: { id: payment.id },
      data: { checkoutUrl: started.checkoutUrl, status: "PROCESSING" },
    });
    return {
      txRef,
      checkoutUrl: started.checkoutUrl,
      amountEtb: money(amount),
      credits,
      provider: input.provider,
      devSimulation: input.provider === "DEV",
    };
  } catch (err) {
    await prisma.billingPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "INIT_FAILED" },
    });
    throw err;
  }
}

export async function verifyAndFulfill(txRef: string, businessId?: string): Promise<PaymentStatusDto> {
  const payment = await prisma.billingPayment.findUnique({ where: { txRef } });
  if (!payment || (businessId && payment.businessId !== businessId)) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found.");
  }
  if (payment.status === "PAID" || payment.status === "REFUNDED") return toDto(payment);

  const verified = await verifyProvider(payment);

  if (verified.status === "pending") {
    await prisma.billingPayment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status: "PROCESSING" },
    });
    return toDto({ ...payment, status: "PROCESSING" });
  }

  if (verified.status !== "success") {
    const status = verified.status === "cancelled" ? "CANCELLED" : "FAILED";
    await prisma.billingPayment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status, failureReason: verified.status === "failed" ? "NOT_PAID" : "CANCELLED" },
    });
    await prisma.billingNotice.create({
      data: { businessId: payment.businessId, kind: "PAYMENT_FAILED", amount: null },
    });
    return toDto({ ...payment, status, fulfilledAt: null });
  }

  const business = await prisma.business.findUnique({ where: { id: payment.businessId } });
  if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

  const now = new Date();
  const renewing =
    payment.purpose === "SUBSCRIPTION" &&
    payment.plan === business.plan &&
    business.planPaidUntil != null &&
    business.planPaidUntil.getTime() > now.getTime();
  const paidUntil = addOneEatMonth(renewing && business.planPaidUntil ? business.planPaidUntil : now);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.billingPayment.updateMany({
      where: {
        id: payment.id,
        status: { in: ["PENDING", "PROCESSING", "FAILED", "CANCELLED"] },
      },
      data: {
        status: "PAID",
        fulfilledAt: now,
        failureReason: null,
        providerRef: verified.providerRef,
      },
    });
    if (claimed.count !== 1) return;

    if (payment.purpose === "SUBSCRIPTION" && payment.plan) {
      await tx.business.update({
        where: { id: payment.businessId },
        data: {
          plan: payment.plan,
          planPaidUntil: paidUntil,
          cancelPlanAtPeriodEnd: false,
          trialEndsAt: null,
          nextBillDiscountPct: 0,
        },
      });
      await grantCreditLotOn(tx, {
        businessId: payment.businessId,
        userId: payment.userId,
        source: "SUBSCRIPTION",
        credits: payment.creditsToGrant,
        periodKey: `payment:${payment.id}`,
        expiresAt: paidUntil,
        entryType: "ALLOCATION",
        description: "Monthly AI credits from a subscription payment",
        paymentId: payment.id,
      });
      await tx.billingNotice.create({
        data: { businessId: payment.businessId, kind: "SUBSCRIPTION_PAID", amount: payment.creditsToGrant },
      });
      return;
    }

    await grantCreditLotOn(tx, {
      businessId: payment.businessId,
      userId: payment.userId,
      source: "PURCHASED",
      credits: payment.creditsToGrant,
      periodKey: `payment:${payment.id}`,
      expiresAt: new Date(now.getTime() + payment.validityDays * DAY_MS),
      entryType: "TOPUP",
      description: "AI credits from a top-up",
      paymentId: payment.id,
    });
    await tx.billingNotice.create({
      data: { businessId: payment.businessId, kind: "TOPUP_PAID", amount: payment.creditsToGrant },
    });
  });

  const fresh = await prisma.billingPayment.findUnique({ where: { id: payment.id } });
  return toDto(fresh ?? payment);
}

export async function simulateDevPayment(
  businessId: string,
  txRef: string,
  outcome: "success" | "failed" | "pending" | "cancelled"
): Promise<PaymentStatusDto> {
  assertProvider("DEV");
  const payment = await prisma.billingPayment.findUnique({ where: { txRef } });
  if (!payment || payment.businessId !== businessId) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found.");
  }
  if (payment.provider !== "DEV") {
    throw new AppError(400, "NOT_A_TEST_PAYMENT", "Only a test payment can be simulated.");
  }
  if (payment.status === "PAID") return toDto(payment);

  await prisma.billingPayment.update({
    where: { id: payment.id },
    data: { devOutcome: outcome },
  });
  return verifyAndFulfill(txRef, businessId);
}

export async function listBusinessPayments(businessId: string): Promise<PaymentStatusDto[]> {
  const rows = await prisma.billingPayment.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toDto);
}

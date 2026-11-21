import {
  Prisma,
  type AiCreditFeature,
  type CreditEntryType,
  type CreditSource,
  type SubscriptionPlan,
} from "@prisma/client";
import type { BillingNoticeKind, WalletDto } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { formatEatDateKey } from "../../utils/eatDate.js";
import { currentUsagePeriod, effectivePlanOf } from "../subscription/subscription.service.js";
import { billingSettings, creditPriceOf, ensureBillingCatalog, getPlanConfig, listActivePackages, listActivePlans } from "./catalog.js";
import {
  amountsMatch,
  etbPerCredit,
  planDraw,
  savingsPercent,
  type LotView,
  type SpendSource,
} from "./credit.policy.js";
import { configuredProviders } from "./payment.providers.js";

export { configuredProviders };

const DAY_MS = 24 * 60 * 60 * 1000;
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** 00:00 Africa/Addis_Ababa on the first day of next month. */
export function nextEatMonthStart(now: Date = new Date()): Date {
  const [year, month] = currentUsagePeriod(now).split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0) - EAT_OFFSET_MS);
}

/** Same clock time one month later, anchored to Addis Ababa midnight of that date. */
export function addOneEatMonth(now: Date = new Date()): Date {
  const eat = new Date(now.getTime() + EAT_OFFSET_MS);
  const year = eat.getUTCFullYear();
  const month = eat.getUTCMonth();
  const day = eat.getUTCDate();
  const target = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return new Date(Date.UTC(year, month + 1, clamped, 0, 0, 0) - EAT_OFFSET_MS);
}

function dec(value: Prisma.Decimal | number): number {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toNumber();
}

async function balanceOf(tx: Prisma.TransactionClient, businessId: string): Promise<number> {
  const sum = await tx.creditLot.aggregate({
    where: {
      businessId,
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _sum: { remaining: true },
  });
  return sum._sum.remaining ?? 0;
}

async function lockLots(tx: Prisma.TransactionClient, businessId: string): Promise<LotView[]> {
  const rows = await tx.$queryRaw<
    Array<{ id: string; source: SpendSource; remaining: number; expires_at: Date | null }>
  >`SELECT id, source::text AS source, remaining, expires_at
    FROM credit_lots
    WHERE business_id = CAST(${businessId} AS uuid)
      AND remaining > 0
    FOR UPDATE`;

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    remaining: row.remaining,
    expiresAt: row.expires_at,
  }));
}

async function writeLedger(
  tx: Prisma.TransactionClient,
  input: {
    businessId: string;
    userId?: string | null;
    type: CreditEntryType;
    source: CreditSource;
    amount: number;
    idempotencyKey: string;
    paymentId?: string | null;
    usageId?: string | null;
    description: string;
  }
): Promise<void> {
  const balanceAfter = await balanceOf(tx, input.businessId);
  await tx.creditLedgerEntry.create({
    data: {
      businessId: input.businessId,
      userId: input.userId ?? null,
      type: input.type,
      source: input.source,
      amount: input.amount,
      balanceAfter,
      idempotencyKey: input.idempotencyKey,
      paymentId: input.paymentId ?? null,
      usageId: input.usageId ?? null,
      description: input.description,
    },
  });
  if (input.amount < 0) {
    const settings = await tx.billingSetting.findUnique({ where: { id: "default" } });
    const threshold = settings?.lowBalanceThreshold ?? 10;
    if (balanceAfter <= threshold) {
      const recent = await tx.billingNotice.findFirst({
        where: {
          businessId: input.businessId,
          kind: "LOW_CREDITS",
          createdAt: { gt: addDays(new Date(), -7) },
        },
      });
      if (!recent) {
        await tx.billingNotice.create({
          data: { businessId: input.businessId, kind: "LOW_CREDITS", amount: balanceAfter },
        });
      }
    }
  }
}

async function createNotice(
  businessId: string,
  kind: BillingNoticeKind,
  amount: number | null
): Promise<void> {
  await prisma.billingNotice.create({ data: { businessId, kind, amount } });
}

export async function grantCreditLotOn(
  tx: Prisma.TransactionClient,
  input: {
    businessId: string;
    userId?: string | null;
    source: CreditSource;
    credits: number;
    periodKey: string;
    expiresAt: Date | null;
    entryType: CreditEntryType;
    description: string;
    paymentId?: string | null;
  }
): Promise<void> {
  await tx.creditLot.create({
    data: {
      businessId: input.businessId,
      source: input.source,
      original: input.credits,
      remaining: input.credits,
      expiresAt: input.expiresAt,
      periodKey: input.periodKey,
    },
  });
  await writeLedger(tx, {
    businessId: input.businessId,
    userId: input.userId,
    type: input.entryType,
    source: input.source,
    amount: input.credits,
    idempotencyKey: `grant:${input.source}:${input.periodKey}:${input.businessId}`,
    paymentId: input.paymentId,
    description: input.description,
  });
}

export async function grantCreditLot(input: {
  businessId: string;
  userId?: string | null;
  source: CreditSource;
  credits: number;
  periodKey: string;
  expiresAt: Date | null;
  entryType: CreditEntryType;
  description: string;
  paymentId?: string | null;
}): Promise<boolean> {
  if (!Number.isInteger(input.credits) || input.credits <= 0) return false;

  const existing = await prisma.creditLot.findUnique({
    where: {
      businessId_source_periodKey: {
        businessId: input.businessId,
        source: input.source,
        periodKey: input.periodKey,
      },
    },
    select: { id: true },
  });
  if (existing) return false;

  try {
    await prisma.$transaction((tx) => grantCreditLotOn(tx, input));
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

/** Free and trial allowances. Paid credits are created only by a verified payment. */
export async function ensureAllowanceCredits(businessId: string): Promise<void> {
  await ensureBillingCatalog();
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;

  const now = new Date();
  const effective = effectivePlanOf(business, now);

  if (business.plan === "FREE" && business.trialEndsAt && business.trialEndsAt.getTime() > now.getTime()) {
    const plan = await getPlanConfig("STARTER");
    await grantCreditLot({
      businessId,
      source: "SUBSCRIPTION",
      credits: plan.monthlyCredits,
      periodKey: `trial:${business.trialEndsAt.toISOString()}`,
      expiresAt: business.trialEndsAt,
      entryType: "ALLOCATION",
      description: "Starter trial AI credits",
    });
    return;
  }

  if (effective === "FREE") {
    const plan = await getPlanConfig("FREE");
    const period = currentUsagePeriod(now);
    await grantCreditLot({
      businessId,
      source: "SUBSCRIPTION",
      credits: plan.monthlyCredits,
      periodKey: `free:${period}`,
      expiresAt: nextEatMonthStart(now),
      entryType: "ALLOCATION",
      description: `Free AI credits for ${period}`,
    });
    return;
  }

  // A plan set by hand (no payment window) still receives its monthly credits.
  if (!business.planPaidUntil) {
    const plan = await getPlanConfig(effective);
    const period = currentUsagePeriod(now);
    await grantCreditLot({
      businessId,
      source: "SUBSCRIPTION",
      credits: plan.monthlyCredits,
      periodKey: `comp:${effective}:${period}`,
      expiresAt: nextEatMonthStart(now),
      entryType: "ALLOCATION",
      description: `${plan.name} AI credits for ${period}`,
    });
  }
}

export async function expireDueCredits(businessId?: string): Promise<number> {
  const now = new Date();
  const where = {
    remaining: { gt: 0 },
    expiresAt: { lte: now },
    ...(businessId ? { businessId } : {}),
  };
  const lots = await prisma.creditLot.findMany({ where, take: 200 });
  let expired = 0;

  for (const lot of lots) {
    const applied = await prisma.$transaction(async (tx) => {
      const claimed = await tx.creditLot.updateMany({
        where: { id: lot.id, remaining: { gt: 0 } },
        data: { remaining: 0 },
      });
      if (claimed.count !== 1) return false;
      await writeLedger(tx, {
        businessId: lot.businessId,
        type: "EXPIRATION",
        source: lot.source,
        amount: -lot.remaining,
        idempotencyKey: `expire:${lot.id}`,
        description: "AI credits expired",
      });
      return true;
    });
    if (applied) {
      expired += 1;
      await createNotice(lot.businessId, "CREDITS_EXPIRED", lot.remaining);
    }
  }

  const lapsed = await prisma.business.findMany({
    where: {
      planPaidUntil: { lt: now },
      plan: { not: "FREE" },
      ...(businessId ? { id: businessId } : {}),
    },
    take: 100,
  });
  if (lapsed.length > 0) {
    for (const business of lapsed) {
      const updated = await prisma.business.updateMany({
        where: { id: business.id, planPaidUntil: { lt: now }, plan: { not: "FREE" } },
        data: { plan: "FREE", cancelPlanAtPeriodEnd: false, planPaidUntil: null },
      });
      if (updated.count === 1) {
        await createNotice(business.id, "SUBSCRIPTION_ENDED", null);
      }
    }
  }

  return expired;
}

export async function reserveAndRun<T>(input: {
  businessId: string;
  userId: string;
  feature: AiCreditFeature;
  provider?: string;
  run: () => Promise<T>;
  accept?: (result: T) => boolean;
}): Promise<T> {
  await ensureBillingCatalog();
  await expireDueCredits(input.businessId);
  await ensureAllowanceCredits(input.businessId);
  await assertAiFeature(input.businessId, input.feature);

  const credits = await creditPriceOf(input.feature);
  if (credits <= 0) return input.run();

  const usageId = crypto.randomUUID();
  const reserved = await prisma.$transaction(async (tx) => {
    const lots = await lockLots(tx, input.businessId);
    const draws = planDraw(lots, credits, new Date());
    if (!draws) {
      const available = lots.reduce((sum, lot) => {
        if (lot.expiresAt && lot.expiresAt.getTime() <= Date.now()) return sum;
        return sum + lot.remaining;
      }, 0);
      throw new AppError(
        402,
        "INSUFFICIENT_CREDITS",
        `You have ${available} AI credits remaining. This needs ${credits}. Buy credits or choose a monthly plan to continue. Adding records by hand does not use AI credits.`,
        { required: credits, available }
      );
    }

    await tx.aiUsageRecord.create({
      data: {
        id: usageId,
        businessId: input.businessId,
        userId: input.userId,
        feature: input.feature,
        provider: input.provider ?? null,
        creditsCharged: credits,
        status: "RESERVED",
      },
    });

    for (const draw of draws) {
      await tx.creditLot.update({
        where: { id: draw.id },
        data: { remaining: { decrement: draw.take } },
      });
      await tx.creditDraw.create({
        data: { usageId, lotId: draw.id, amount: draw.take },
      });
    }

    await writeLedger(tx, {
      businessId: input.businessId,
      userId: input.userId,
      type: "USAGE",
      source: lots.find((lot) => lot.id === draws[0]?.id)?.source ?? "SUBSCRIPTION",
      amount: -credits,
      idempotencyKey: `usage:${usageId}`,
      usageId,
      description: `AI credits for ${input.feature.toLowerCase().replace("_", " ")}`,
    });
    return true;
  });

  if (!reserved) return input.run();

  try {
    const result = await input.run();
    const accepted = input.accept ? input.accept(result) : true;
    if (!accepted) {
      await refundUsage(usageId, input.businessId).catch((refundErr) => {
        console.error("[Billing] refund failed", refundErr instanceof Error ? refundErr.message : "unknown");
      });
      return result;
    }
    await prisma.aiUsageRecord.update({
      where: { id: usageId },
      data: { status: "SETTLED" },
    });
    return result;
  } catch (err) {
    await refundUsage(usageId, input.businessId).catch((refundErr) => {
      console.error("[Billing] refund failed", refundErr instanceof Error ? refundErr.message : "unknown");
    });
    throw err;
  }
}

async function refundUsage(usageId: string, businessId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const usage = await tx.aiUsageRecord.findUnique({ where: { id: usageId } });
    if (!usage || usage.status === "REFUNDED") return;

    const draws = await tx.creditDraw.findMany({ where: { usageId, refunded: false } });
    for (const draw of draws) {
      await tx.creditLot.update({
        where: { id: draw.lotId },
        data: { remaining: { increment: draw.amount } },
      });
      await tx.creditDraw.update({ where: { id: draw.id }, data: { refunded: true } });
    }

    await tx.aiUsageRecord.update({ where: { id: usageId }, data: { status: "REFUNDED" } });
    if (draws.length > 0) {
      await writeLedger(tx, {
        businessId,
        userId: usage.userId,
        type: "REFUND",
        source: "SUBSCRIPTION",
        amount: usage.creditsCharged,
        idempotencyKey: `refund:${usageId}`,
        usageId,
        description: "AI credits returned because the request did not finish",
      });
    }
  });
}

export async function assertAiFeature(businessId: string, feature: AiCreditFeature): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  const plan = await getPlanConfig(effectivePlanOf(business));

  if ((feature === "VISION" || feature === "RECEIPT") && !plan.cameraEnabled) {
    throw new AppError(403, "PLAN_FEATURE", "Camera AI is not included in the current plan.");
  }
  if ((feature === "VOICE_TURN" || feature === "TTS") && !plan.voiceEnabled) {
    throw new AppError(403, "PLAN_FEATURE", "Voice AI is not included in the current plan.");
  }
}

export async function assertCapacity(businessId: string, kind: "products" | "customers"): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;
  const plan = await getPlanConfig(effectivePlanOf(business));
  const limit = kind === "products" ? plan.productLimit : plan.customerLimit;
  if (limit == null) return;

  const count =
    kind === "products"
      ? await prisma.product.count({ where: { businessId } })
      : await prisma.customer.count({ where: { businessId } });

  if (count >= limit) {
    throw new AppError(
      403,
      "PLAN_LIMIT",
      kind === "products"
        ? `This plan includes ${limit} products. Choose a larger plan to add more.`
        : `This plan includes ${limit} customers. Choose a larger plan to add more.`
    );
  }
}

export async function grantReferralCredits(input: {
  referralId: string;
  referrerUserId: string;
  referredUserId: string;
}): Promise<void> {
  if (input.referrerUserId === input.referredUserId) return;
  const settings = await billingSettings();
  const referrer = await prisma.business.findFirst({ where: { ownerId: input.referrerUserId } });
  const referred = await prisma.business.findFirst({ where: { ownerId: input.referredUserId } });
  if (!referrer || !referred || referrer.id === referred.id) return;

  const expiresAt = addDays(new Date(), settings.referralCreditDays);
  const referrerGranted = await grantCreditLot({
    businessId: referrer.id,
    userId: input.referrerUserId,
    source: "REFERRAL",
    credits: settings.referralReferrerCredits,
    periodKey: `referral:${input.referralId}:referrer`,
    expiresAt,
    entryType: "REFERRAL_REWARD",
    description: "AI credits for a successful invite",
  });
  const welcomeGranted = await grantCreditLot({
    businessId: referred.id,
    userId: input.referredUserId,
    source: "REFERRAL",
    credits: settings.referralWelcomeCredits,
    periodKey: `referral:${input.referralId}:welcome`,
    expiresAt,
    entryType: "REFERRAL_REWARD",
    description: "Welcome AI credits from an invite",
  });
  if (referrerGranted) await createNotice(referrer.id, "REFERRAL_CREDITS", settings.referralReferrerCredits);
  if (welcomeGranted) await createNotice(referred.id, "REFERRAL_CREDITS", settings.referralWelcomeCredits);
}

export async function grantWelcomePromotion(businessId: string, userId: string): Promise<void> {
  await ensureBillingCatalog();
  const now = new Date();
  const promo = await prisma.billingPromotion.findFirst({
    where: {
      kind: "WELCOME",
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    },
  });
  if (!promo || promo.credits <= 0) return;
  if (promo.endsAt && promo.endsAt.getTime() < now.getTime()) return;
  if (promo.maxGrants != null && promo.grantCount >= promo.maxGrants) return;

  const granted = await grantCreditLot({
    businessId,
    userId,
    source: "PROMO",
    credits: promo.credits,
    periodKey: `promo:${promo.code}:${businessId}`,
    expiresAt: addDays(now, promo.validityDays),
    entryType: "PROMO_REWARD",
    description: promo.name,
  });
  if (!granted) return;

  await prisma.billingPromotion.update({
    where: { id: promo.id },
    data: { grantCount: { increment: 1 } },
  });
  await createNotice(businessId, "PROMO_CREDITS", promo.credits);
}

export async function adminAdjustCredits(input: {
  businessId: string;
  credits: number;
  direction: "grant" | "debit";
  note: string;
  idempotencyKey: string;
}): Promise<number> {
  await ensureBillingCatalog();
  if (!Number.isInteger(input.credits) || input.credits <= 0 || input.credits > 1_000_000) {
    throw new AppError(400, "INVALID_CREDITS", "Credit amount must be a positive whole number");
  }

  if (input.direction === "grant") {
    await grantCreditLot({
      businessId: input.businessId,
      source: "ADMIN",
      credits: input.credits,
      periodKey: `admin:${input.idempotencyKey}`,
      expiresAt: addDays(new Date(), 90),
      entryType: "ADMIN_GRANT",
      description: input.note.slice(0, 240),
    });
    return balanceOf(prisma, input.businessId);
  }

  await prisma.$transaction(async (tx) => {
    const lots = await lockLots(tx, input.businessId);
    const draws = planDraw(lots, input.credits, new Date());
    if (!draws) throw new AppError(409, "INSUFFICIENT_CREDITS", "The wallet does not have that many credits");
    for (const draw of draws) {
      await tx.creditLot.update({
        where: { id: draw.id },
        data: { remaining: { decrement: draw.take } },
      });
    }
    await writeLedger(tx, {
      businessId: input.businessId,
      type: "ADMIN_DEBIT",
      source: "ADMIN",
      amount: -input.credits,
      idempotencyKey: `admin-debit:${input.idempotencyKey}`,
      description: input.note.slice(0, 240),
    });
  });
  return balanceOf(prisma, input.businessId);
}

function subscriptionStatus(business: {
  plan: SubscriptionPlan;
  planPaidUntil: Date | null;
  cancelPlanAtPeriodEnd: boolean;
}): WalletDto["subscription"]["status"] {
  if (business.plan === "FREE") return "FREE";
  if (business.planPaidUntil && business.planPaidUntil.getTime() <= Date.now()) return "EXPIRED";
  if (business.cancelPlanAtPeriodEnd) return "CANCEL_SCHEDULED";
  return "ACTIVE";
}

export async function getWallet(businessId: string): Promise<WalletDto> {
  await ensureBillingCatalog();
  await expireDueCredits(businessId);
  await ensureAllowanceCredits(businessId);

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

  const now = new Date();
  const weekAhead = addDays(now, 7);
  const lots = await prisma.creditLot.findMany({
    where: {
      businessId,
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  const sources: SpendSource[] = ["SUBSCRIPTION", "PURCHASED", "REFERRAL", "PROMO", "ADMIN"];
  const balances = sources.map((source) => {
    const rows = lots.filter((lot) => lot.source === source);
    return {
      source,
      remaining: rows.reduce((sum, lot) => sum + lot.remaining, 0),
      expiringWithin7Days: rows
        .filter((lot) => lot.expiresAt && lot.expiresAt <= weekAhead)
        .reduce((sum, lot) => sum + lot.remaining, 0),
    };
  });

  const expiring = lots
    .filter((lot) => lot.expiresAt && lot.expiresAt <= weekAhead)
    .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime());

  const plans = await listActivePlans();
  const packages = await listActivePackages();
  const prices = await prisma.aiCreditPrice.findMany();
  const ledger = await prisma.creditLedgerEntry.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const notices = await prisma.billingNotice.findMany({
    where: { businessId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const monthStart = new Date(`${formatEatDateKey(now).slice(0, 7)}-01T00:00:00+03:00`);
  const spend = await prisma.billingPayment.aggregate({
    where: {
      businessId,
      purpose: "TOPUP",
      status: "PAID",
      fulfilledAt: { gte: monthStart },
    },
    _sum: { amount: true },
  });
  const topUpSpend = spend._sum.amount ?? new Prisma.Decimal(0);

  const planDtos = plans.map((plan) => {
    const per = etbPerCredit(plan.priceEtb, plan.monthlyCredits);
    return {
      plan: plan.plan,
      name: plan.name,
      description: plan.description,
      priceEtb: dec(plan.priceEtb),
      monthlyCredits: plan.monthlyCredits,
      monthlyReplies: plan.monthlyReplies,
      voiceEnabled: plan.voiceEnabled,
      cameraEnabled: plan.cameraEnabled,
      analyticsEnabled: plan.analyticsEnabled,
      productLimit: plan.productLimit,
      customerLimit: plan.customerLimit,
      etbPerCredit: per ? dec(per) : null,
      active: plan.active,
    };
  });

  const packageDtos = packages.map((item) => {
    const totalCredits = item.credits + item.bonusCredits;
    const per = etbPerCredit(item.priceEtb, totalCredits);
    return {
      code: item.code,
      name: item.name,
      description: item.description,
      priceEtb: dec(item.priceEtb),
      credits: item.credits,
      bonusCredits: item.bonusCredits,
      totalCredits,
      validityDays: item.validityDays,
      etbPerCredit: per ? dec(per) : 0,
    };
  });

  const paidPlans = planDtos.filter((plan) => plan.etbPerCredit != null);
  const best = paidPlans.reduce<number | null>((lowest, plan) => {
    if (plan.etbPerCredit == null) return lowest;
    return lowest == null || plan.etbPerCredit < lowest ? plan.etbPerCredit : lowest;
  }, null);
  const cheapestTopUp = packageDtos.reduce<number | null>((lowest, item) => {
    return lowest == null || item.etbPerCredit < lowest ? item.etbPerCredit : lowest;
  }, null);

  const savings =
    best != null && cheapestTopUp != null
      ? savingsPercent(new Prisma.Decimal(best), new Prisma.Decimal(cheapestTopUp))
      : null;

  const suggested = paidPlans
    .filter((plan) => topUpSpend.gte(new Prisma.Decimal(plan.priceEtb).mul("0.70")))
    .sort((a, b) => a.priceEtb - b.priceEtb)[0];

  const effective = effectivePlanOf(business, now);
  const currentPlan = await getPlanConfig(effective);

  return {
    total: balances.reduce((sum, row) => sum + row.remaining, 0),
    balances,
    expiringWithin7Days: expiring.reduce((sum, lot) => sum + lot.remaining, 0),
    nextExpiryAt: expiring[0]?.expiresAt?.toISOString() ?? null,
    subscription: {
      plan: business.plan,
      status: subscriptionStatus(business),
      paidUntil: business.planPaidUntil?.toISOString() ?? null,
      monthlyCredits: currentPlan.monthlyCredits,
      priceEtb: dec(currentPlan.priceEtb),
      periodResetsOn: formatEatDateKey(nextEatMonthStart(now)),
    },
    plans: planDtos,
    packages: packageDtos,
    prices: prices.map((row) => ({ feature: row.feature, credits: row.credits })),
    providers: configuredProviders(),
    ledger: ledger.map((row) => ({
      id: row.id,
      type: row.type,
      source: row.source,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
    })),
    notices: notices.map((row) => ({
      id: row.id,
      kind: row.kind as BillingNoticeKind,
      amount: row.amount,
      createdAt: row.createdAt.toISOString(),
    })),
    bestSubscriptionEtbPerCredit: best,
    cheapestTopUpEtbPerCredit: cheapestTopUp,
    subscriptionSavingsPct: savings ? savings.toNumber() : null,
    topUpSpendThisMonthEtb: dec(topUpSpend),
    suggestedPlan: suggested?.plan ?? null,
  };
}

export async function markNoticesRead(businessId: string): Promise<void> {
  await prisma.billingNotice.updateMany({
    where: { businessId, readAt: null },
    data: { readAt: new Date() },
  });
}

export { amountsMatch };

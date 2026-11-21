import { Prisma, type Business } from "@prisma/client";
import type {
  BillingActionResponse,
  SubscriptionPlan,
  SubscriptionSummaryDto,
  VoiceQuotaDto,
} from "@mizan/shared";
import { env } from "../../config/env.js";
import { VOICE_PACK } from "../../config/plans.js";
import { getPlanConfig, listActivePlans } from "../billing/catalog.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { formatEatDateKey } from "../../utils/eatDate.js";

export type ReplySource = "PLAN" | "BONUS";

/** Usage month in Africa/Addis_Ababa, e.g. "2026-11". */
export function currentUsagePeriod(now: Date = new Date()): string {
  return formatEatDateKey(now).slice(0, 7);
}

function nextPeriodStartKey(now: Date = new Date()): string {
  const [year, month] = currentUsagePeriod(now).split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

/** A FREE shop with an active reward trial behaves like STARTER. */
export function effectivePlanOf(
  business: Pick<Business, "plan" | "trialEndsAt">,
  now: Date = new Date()
): SubscriptionPlan {
  if (
    business.plan === "FREE" &&
    business.trialEndsAt &&
    business.trialEndsAt.getTime() > now.getTime()
  ) {
    return "STARTER";
  }
  return business.plan;
}

export function toVoiceQuota(
  business: Business,
  now: Date = new Date(),
  monthlyAllowance = 0
): VoiceQuotaDto {
  const effectivePlan = effectivePlanOf(business, now);
  const periodIsCurrent = business.usagePeriod === currentUsagePeriod(now);
  const used = periodIsCurrent ? business.voiceRepliesUsed : 0;
  const planRemaining = Math.max(0, monthlyAllowance - used);

  return {
    plan: business.plan,
    effectivePlan,
    monthlyAllowance,
    used,
    bonusReplies: business.voiceBonusReplies,
    remaining: planRemaining + business.voiceBonusReplies,
    trialEndsAt: business.trialEndsAt ? business.trialEndsAt.toISOString() : null,
    periodResetsOn: nextPeriodStartKey(now),
  };
}

async function loadBusiness(businessId: string): Promise<Business> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  }
  return business;
}

/** Starts a new monthly counter the first time a shop speaks in a new month. */
async function rollUsagePeriod(businessId: string): Promise<void> {
  const period = currentUsagePeriod();
  await prisma.business.updateMany({
    where: { id: businessId, NOT: { usagePeriod: period } },
    data: { usagePeriod: period, voiceRepliesUsed: 0 },
  });
}

export async function getVoiceQuota(businessId: string): Promise<VoiceQuotaDto> {
  const business = await loadBusiness(businessId);
  const plan = await getPlanConfig(effectivePlanOf(business));
  return toVoiceQuota(business, new Date(), plan.monthlyReplies);
}

/**
 * Atomically takes one spoken reply from the plan allowance, then from bonus
 * replies. Conditional updates mean two parallel requests can never overspend.
 */
export async function reserveVoiceReply(
  businessId: string
): Promise<{ source: ReplySource | null; quota: VoiceQuotaDto }> {
  await rollUsagePeriod(businessId);
  const business = await loadBusiness(businessId);
  const allowance = (await getPlanConfig(effectivePlanOf(business))).monthlyReplies;

  const planClaim = await prisma.business.updateMany({
    where: { id: businessId, voiceRepliesUsed: { lt: allowance } },
    data: { voiceRepliesUsed: { increment: 1 } },
  });

  let source: ReplySource | null = null;
  if (planClaim.count === 1) {
    source = "PLAN";
  } else {
    const bonusClaim = await prisma.business.updateMany({
      where: { id: businessId, voiceBonusReplies: { gt: 0 } },
      data: { voiceBonusReplies: { decrement: 1 } },
    });
    if (bonusClaim.count === 1) source = "BONUS";
  }

  return { source, quota: toVoiceQuota(await loadBusiness(businessId), new Date(), allowance) };
}

/** Gives a reply back when speech could not actually be produced. */
export async function refundVoiceReply(
  businessId: string,
  source: ReplySource
): Promise<void> {
  if (source === "PLAN") {
    await prisma.business.updateMany({
      where: { id: businessId, voiceRepliesUsed: { gt: 0 } },
      data: { voiceRepliesUsed: { decrement: 1 } },
    });
  } else {
    await prisma.business.updateMany({
      where: { id: businessId },
      data: { voiceBonusReplies: { increment: 1 } },
    });
  }
}

export async function grantBonusReplies(businessId: string, replies: number): Promise<void> {
  await prisma.business.update({
    where: { id: businessId },
    data: { voiceBonusReplies: { increment: replies } },
  });
}

export async function getSubscriptionSummary(
  businessId: string
): Promise<SubscriptionSummaryDto> {
  const business = await loadBusiness(businessId);
  const plans = await listActivePlans();
  const current = plans.find((plan) => plan.plan === effectivePlanOf(business)) ?? (await getPlanConfig(effectivePlanOf(business)));
  return {
    quota: toVoiceQuota(business, new Date(), current.monthlyReplies),
    plans: plans.map((plan) => ({
      plan: plan.plan,
      priceEtb: plan.priceEtb.toNumber(),
      monthlyReplies: plan.monthlyReplies,
    })),
    voicePack: { ...VOICE_PACK },
    nextBillDiscountPct: business.nextBillDiscountPct,
    manualBillingEnabled: env.manualBillingEnabled,
  };
}

function assertManualBilling(): void {
  if (!env.manualBillingEnabled) {
    throw new AppError(
      503,
      "BILLING_NOT_CONNECTED",
      "Online payment is not connected yet. Please contact Mizan to change your plan."
    );
  }
}

/** Applies a percentage discount using exact decimal arithmetic. */
function applyDiscount(priceEtb: number, discountPct: number): Prisma.Decimal {
  const price = new Prisma.Decimal(priceEtb);
  const keep = new Prisma.Decimal(100 - discountPct).div(100);
  return price.mul(keep).toDecimalPlaces(2);
}

export async function changePlan(
  businessId: string,
  plan: SubscriptionPlan
): Promise<BillingActionResponse> {
  assertManualBilling();
  const business = await loadBusiness(businessId);

  const config = await getPlanConfig(plan);
  if (!config.active) {
    throw new AppError(400, "PLAN_UNAVAILABLE", "That plan is not available.");
  }
  const price = config.priceEtb.toNumber();
  const discountPct = price > 0 ? business.nextBillDiscountPct : 0;
  const charged = applyDiscount(price, discountPct);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      plan,
      // A paid plan replaces any reward trial, and a used discount is spent.
      ...(price > 0 ? { trialEndsAt: null, nextBillDiscountPct: 0 } : {}),
    },
  });

  return {
    summary: await getSubscriptionSummary(businessId),
    chargedEtb: charged.toNumber(),
    discountAppliedPct: discountPct,
  };
}

export async function buyVoicePack(businessId: string): Promise<BillingActionResponse> {
  assertManualBilling();
  await loadBusiness(businessId);
  await grantBonusReplies(businessId, VOICE_PACK.replies);

  return {
    summary: await getSubscriptionSummary(businessId),
    chargedEtb: VOICE_PACK.priceEtb,
    discountAppliedPct: 0,
  };
}

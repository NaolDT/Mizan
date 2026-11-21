import type { RedeemOptionId, SubscriptionPlan } from "@mizan/shared";

/**
 * Single source of truth for pricing, voice allowances, and reward rules.
 * Speech is the real cost (about 1.8 ETB per spoken reply at Addis AI list
 * prices), so plans sell a fixed number of spoken replies per month.
 */
export const PLAN_CONFIG: Record<
  SubscriptionPlan,
  { priceEtb: number; monthlyReplies: number }
> = {
  FREE: { priceEtb: 0, monthlyReplies: 5 },
  STARTER: { priceEtb: 99, monthlyReplies: 25 },
  PRO: { priceEtb: 199, monthlyReplies: 70 },
  BUSINESS: { priceEtb: 399, monthlyReplies: 150 },
};

export const VOICE_PACK = { replies: 10, priceEtb: 30 } as const;

export const REWARD_RULES = {
  firstTransactionsRequired: 5,
  firstTransactionsPoints: 50,
  streakDays: 7,
  streakPoints: 100,
  referralWindowDays: 7,
  referralMinTransactions: 5,
  referrerPoints: 200,
  referredPoints: 100,
  welcomeReplies: 10,
  maxQualifiedReferralsPer30Days: 10,
} as const;

export const REDEEM_RULES = {
  EXTRA_VOICE: { costPoints: 500, replies: 10 },
  DISCOUNT_10: { costPoints: 800, discountPct: 10 },
  STARTER_WEEK: { costPoints: 1500, days: 7, cooldownDays: 90 },
} as const satisfies Record<RedeemOptionId, object>;

import crypto from "node:crypto";
import { Prisma, type Business, type RewardEventType } from "@prisma/client";
import type {
  RedeemBlockReason,
  RedeemOptionDto,
  RedeemOptionId,
  RedeemResponse,
  ReferralDto,
  ReferralProgressDto,
  RewardSummaryDto,
} from "@mizan/shared";
import { REDEEM_RULES, REWARD_RULES } from "../../config/plans.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { formatEatDateKey } from "../../utils/eatDate.js";
import { getSubscriptionSummary } from "../subscription/subscription.service.js";

type Db = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;
const REDEEM_OPTION_IDS: RedeemOptionId[] = ["EXTRA_VOICE", "DISCOUNT_10", "STARTER_WEEK"];

// ─────────────────────────────────────────────────────────────────────────────
// Ledger primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds points exactly once per (userId, sourceKey). Running the same
 * evaluation twice, or two requests at once, can never pay twice.
 */
async function grantPoints(
  db: Db,
  params: {
    userId: string;
    type: RewardEventType;
    points: number;
    description: string;
    sourceKey: string;
    referralId?: string;
  }
): Promise<boolean> {
  const result = await db.rewardLedger.createMany({
    data: [
      {
        userId: params.userId,
        type: params.type,
        points: params.points,
        description: params.description,
        sourceKey: params.sourceKey,
        referralId: params.referralId ?? null,
      },
    ],
    skipDuplicates: true,
  });
  return result.count === 1;
}

async function getBalance(db: Db, userId: string): Promise<number> {
  const result = await db.rewardLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral codes
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function buildReferralCode(name: string): string {
  const letters = name.normalize("NFKD").replace(/[^A-Za-z]/g, "").toUpperCase();
  const prefix = (letters.slice(0, 4) || "SHOP").padEnd(4, "X");
  const digits = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  return `MIZAN-${prefix}-${digits}`;
}

/** Makes a code no other shop owner has. Call inside the signup transaction. */
export async function generateUniqueReferralCode(db: Db, name: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = buildReferralCode(name);
    const taken = await db.user.findUnique({ where: { referralCode: code } });
    if (!taken) return code;
  }
  throw new AppError(500, "REFERRAL_CODE_FAILED", "Could not create a referral code");
}

async function ensureReferralCode(userId: string, fallbackName: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User account not found");
  if (user.referralCode) return user.referralCode;

  // Accounts created before referrals existed get their code on first visit.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await generateUniqueReferralCode(prisma, user.name || fallbackName);
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return updated.referralCode ?? code;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
      const reread = await prisma.user.findUnique({ where: { id: userId } });
      if (reread?.referralCode) return reread.referralCode;
    }
  }
  throw new AppError(500, "REFERRAL_CODE_FAILED", "Could not create a referral code");
}

/** Resolves a code typed at signup to the owner it belongs to. */
export async function resolveReferrerByCode(rawCode: string) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  return prisma.user.findUnique({ where: { referralCode: code } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Earning rules (deterministic, evaluated after each completed transaction)
// ─────────────────────────────────────────────────────────────────────────────

function eatDayNumber(dateKey: string): number {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
}

/** Length of the daily-logging run that ends today or yesterday, plus its first day. */
function currentStreak(dayKeys: string[], now: Date): { length: number; startKey: string | null } {
  if (dayKeys.length === 0) return { length: 0, startKey: null };

  const days = Array.from(new Set(dayKeys.map(eatDayNumber))).sort((a, b) => b - a);
  const today = eatDayNumber(formatEatDateKey(now));
  if (days[0] < today - 1) return { length: 0, startKey: null };

  let length = 1;
  while (length < days.length && days[length] === days[length - 1] - 1) length += 1;

  const startKey = new Date((days[length - 1]) * DAY_MS).toISOString().slice(0, 10);
  return { length, startKey };
}

async function countCompletedTransactions(
  businessId: string,
  from?: Date,
  to?: Date
): Promise<number> {
  return prisma.transaction.count({
    where: {
      businessId,
      status: "COMPLETED",
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
  });
}

async function awardFirstTransactions(userId: string, businessId: string): Promise<void> {
  const total = await countCompletedTransactions(businessId);
  if (total < REWARD_RULES.firstTransactionsRequired) return;

  await grantPoints(prisma, {
    userId,
    type: "EARN_FIRST_TRANSACTIONS",
    points: REWARD_RULES.firstTransactionsPoints,
    description: `Recorded your first ${REWARD_RULES.firstTransactionsRequired} transactions`,
    sourceKey: "first-transactions",
  });
}

async function awardStreak(userId: string, businessId: string, now: Date): Promise<void> {
  const since = new Date(now.getTime() - 60 * DAY_MS);
  const rows = await prisma.transaction.findMany({
    where: { businessId, status: "COMPLETED", createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const streak = currentStreak(
    rows.map((row) => formatEatDateKey(row.createdAt)),
    now
  );
  if (!streak.startKey) return;

  const milestones = Math.floor(streak.length / REWARD_RULES.streakDays);
  for (let step = 1; step <= milestones; step += 1) {
    await grantPoints(prisma, {
      userId,
      type: "EARN_STREAK_7",
      points: REWARD_RULES.streakPoints,
      description: `Recorded transactions ${REWARD_RULES.streakDays * step} days in a row`,
      // Keyed by the run's first day so a later, separate streak can pay again.
      sourceKey: `streak:${streak.startKey}:${step}`,
    });
  }
}

async function qualifyReferralIfReady(referredUserId: string, businessId: string, now: Date) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId } });
  if (!referral || referral.status !== "PENDING") return;

  const windowEnd = new Date(referral.createdAt.getTime() + REWARD_RULES.referralWindowDays * DAY_MS);
  const countInWindow = await countCompletedTransactions(businessId, referral.createdAt, windowEnd);

  if (countInWindow < REWARD_RULES.referralMinTransactions) {
    if (now.getTime() > windowEnd.getTime()) {
      await prisma.referral.updateMany({
        where: { id: referral.id, status: "PENDING" },
        data: { status: "REJECTED", rejectionReason: "WINDOW_EXPIRED" },
      });
    }
    return;
  }

  const qualifiedRecently = await prisma.referral.count({
    where: {
      referrerId: referral.referrerId,
      status: "QUALIFIED",
      qualifiedAt: { gte: new Date(now.getTime() - 30 * DAY_MS) },
    },
  });
  if (qualifiedRecently >= REWARD_RULES.maxQualifiedReferralsPer30Days) {
    await prisma.referral.updateMany({
      where: { id: referral.id, status: "PENDING" },
      data: { status: "REJECTED", rejectionReason: "REFERRER_LIMIT" },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Only one caller can flip PENDING to QUALIFIED, so rewards are paid once.
    const claimed = await tx.referral.updateMany({
      where: { id: referral.id, status: "PENDING" },
      data: { status: "QUALIFIED", qualifiedAt: now },
    });
    if (claimed.count !== 1) return;

    await grantPoints(tx, {
      userId: referral.referrerId,
      type: "EARN_REFERRAL_REFERRER",
      points: REWARD_RULES.referrerPoints,
      description: "A shop you invited started using Mizan",
      sourceKey: `referral:${referral.id}:referrer`,
      referralId: referral.id,
    });
    await grantPoints(tx, {
      userId: referral.referredUserId,
      type: "EARN_REFERRAL_WELCOME",
      points: REWARD_RULES.referredPoints,
      description: "Welcome bonus for joining with an invite",
      sourceKey: `referral:${referral.id}:referred`,
      referralId: referral.id,
    });
    await tx.business.updateMany({
      where: { ownerId: referral.referredUserId },
      data: { voiceBonusReplies: { increment: REWARD_RULES.welcomeReplies } },
    });
  });

  const { grantReferralCredits } = await import("../billing/credit.service.js");
  await grantReferralCredits({
    referralId: referral.id,
    referrerUserId: referral.referrerId,
    referredUserId: referral.referredUserId,
  }).catch((err) => {
    console.error("[Billing] referral credits failed", err instanceof Error ? err.message : "unknown");
  });
}

/** Runs every earning rule for a shop. Safe to call repeatedly. */
export async function evaluateRewardsForBusiness(businessId: string): Promise<void> {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;

  const now = new Date();
  await awardFirstTransactions(business.ownerId, businessId);
  await awardStreak(business.ownerId, businessId, now);
  await qualifyReferralIfReady(business.ownerId, businessId, now);
}

// ─────────────────────────────────────────────────────────────────────────────
// Redeeming
// ─────────────────────────────────────────────────────────────────────────────

function redeemBlockReason(
  option: RedeemOptionId,
  balance: number,
  business: Business,
  lastStarterWeekAt: Date | null,
  now: Date
): RedeemBlockReason | null {
  if (option === "DISCOUNT_10" && business.nextBillDiscountPct > 0) return "ALREADY_ACTIVE";

  if (option === "STARTER_WEEK") {
    const trialActive = business.trialEndsAt !== null && business.trialEndsAt.getTime() > now.getTime();
    if (business.plan !== "FREE" || trialActive) return "ALREADY_ACTIVE";
    if (
      lastStarterWeekAt &&
      now.getTime() - lastStarterWeekAt.getTime() < REDEEM_RULES.STARTER_WEEK.cooldownDays * DAY_MS
    ) {
      return "COOLDOWN";
    }
  }

  if (balance < REDEEM_RULES[option].costPoints) return "NOT_ENOUGH_POINTS";
  return null;
}

async function lastStarterWeekRedeemedAt(db: Db, userId: string): Promise<Date | null> {
  const entry = await db.rewardLedger.findFirst({
    where: { userId, type: "REDEEM_STARTER_WEEK" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return entry?.createdAt ?? null;
}

export async function redeemReward(
  userId: string,
  businessId: string,
  option: RedeemOptionId
): Promise<RedeemResponse> {
  const rule = REDEEM_RULES[option];

  try {
    await prisma.$transaction(
      async (tx) => {
        const business = await tx.business.findFirst({ where: { id: businessId, ownerId: userId } });
        if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

        const now = new Date();
        const balance = await getBalance(tx, userId);
        const lastStarterWeek = await lastStarterWeekRedeemedAt(tx, userId);
        const blocked = redeemBlockReason(option, balance, business, lastStarterWeek, now);
        if (blocked) {
          throw new AppError(409, blocked, "This reward is not available right now");
        }

        const type: RewardEventType =
          option === "EXTRA_VOICE"
            ? "REDEEM_EXTRA_VOICE"
            : option === "DISCOUNT_10"
              ? "REDEEM_DISCOUNT"
              : "REDEEM_STARTER_WEEK";

        await grantPoints(tx, {
          userId,
          type,
          points: -rule.costPoints,
          description: `Redeemed ${option}`,
          sourceKey: `redeem:${option}:${crypto.randomUUID()}`,
        });

        if (option === "EXTRA_VOICE") {
          await tx.business.update({
            where: { id: businessId },
            data: { voiceBonusReplies: { increment: REDEEM_RULES.EXTRA_VOICE.replies } },
          });
        } else if (option === "DISCOUNT_10") {
          await tx.business.update({
            where: { id: businessId },
            data: { nextBillDiscountPct: REDEEM_RULES.DISCOUNT_10.discountPct },
          });
        } else {
          await tx.business.update({
            where: { id: businessId },
            data: {
              trialEndsAt: new Date(now.getTime() + REDEEM_RULES.STARTER_WEEK.days * DAY_MS),
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new AppError(409, "TRY_AGAIN", "Please try again");
    }
    throw err;
  }

  return {
    rewards: await getRewardSummary(userId, businessId),
    subscription: await getSubscriptionSummary(businessId),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary for the Rewards screen
// ─────────────────────────────────────────────────────────────────────────────

async function buildProgress(
  referredUserId: string,
  createdAt: Date
): Promise<ReferralProgressDto> {
  const windowEnd = new Date(createdAt.getTime() + REWARD_RULES.referralWindowDays * DAY_MS);
  const business = await prisma.business.findFirst({
    where: { ownerId: referredUserId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const transactions = business
    ? await countCompletedTransactions(business.id, createdAt, windowEnd)
    : 0;

  return {
    transactions: Math.min(transactions, REWARD_RULES.referralMinTransactions),
    required: REWARD_RULES.referralMinTransactions,
    windowEndsAt: windowEnd.toISOString(),
  };
}

export async function getRewardSummary(
  userId: string,
  businessId: string
): Promise<RewardSummaryDto> {
  const now = new Date();
  const business = await prisma.business.findFirst({ where: { id: businessId, ownerId: userId } });
  if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

  // Invites that were never used inside their window are closed out here.
  await prisma.referral.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(now.getTime() - REWARD_RULES.referralWindowDays * DAY_MS) },
      OR: [{ referrerId: userId }, { referredUserId: userId }],
    },
    data: { status: "REJECTED", rejectionReason: "WINDOW_EXPIRED" },
  });

  const referralCode = await ensureReferralCode(userId, business.name);
  const balance = await getBalance(prisma, userId);
  const lastStarterWeek = await lastStarterWeekRedeemedAt(prisma, userId);

  const madeRows = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { referredUser: { select: { businesses: { select: { name: true }, take: 1 } } } },
  });

  const referrals: ReferralDto[] = await Promise.all(
    madeRows.map(async (row) => ({
      id: row.id,
      status: row.status,
      referredShopName: row.referredUser.businesses[0]?.name ?? null,
      progress: await buildProgress(row.referredUserId, row.createdAt),
      qualifiedAt: row.qualifiedAt ? row.qualifiedAt.toISOString() : null,
      rejectionReason: row.rejectionReason,
      pointsEarned: row.status === "QUALIFIED" ? REWARD_RULES.referrerPoints : 0,
      createdAt: row.createdAt.toISOString(),
    }))
  );

  const receivedRow = await prisma.referral.findUnique({ where: { referredUserId: userId } });
  const referredBy = receivedRow
    ? {
        status: receivedRow.status,
        rejectionReason: receivedRow.rejectionReason,
        progress: await buildProgress(userId, receivedRow.createdAt),
      }
    : null;

  const ledger = await prisma.rewardLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const redeemOptions: RedeemOptionDto[] = REDEEM_OPTION_IDS.map((id) => {
    const blockedReason = redeemBlockReason(id, balance, business, lastStarterWeek, now);
    return {
      id,
      costPoints: REDEEM_RULES[id].costPoints,
      available: blockedReason === null,
      blockedReason,
    };
  });

  return {
    balance,
    referralCode,
    referralLinkPath: `/auth?mode=register&ref=${encodeURIComponent(referralCode)}`,
    referrals,
    referredBy,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      type: entry.type,
      points: entry.points,
      createdAt: entry.createdAt.toISOString(),
    })),
    redeemOptions,
    rules: {
      firstTransactionsRequired: REWARD_RULES.firstTransactionsRequired,
      firstTransactionsPoints: REWARD_RULES.firstTransactionsPoints,
      streakDays: REWARD_RULES.streakDays,
      streakPoints: REWARD_RULES.streakPoints,
      referralWindowDays: REWARD_RULES.referralWindowDays,
      referralMinTransactions: REWARD_RULES.referralMinTransactions,
      referrerPoints: REWARD_RULES.referrerPoints,
      referredPoints: REWARD_RULES.referredPoints,
      welcomeReplies: REWARD_RULES.welcomeReplies,
    },
  };
}

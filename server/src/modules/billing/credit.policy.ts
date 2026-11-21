import { Prisma } from "@prisma/client";

/** Credits that expire sooner are spent first. Same expiry follows this order. */
export const SOURCE_PRIORITY = ["PROMO", "REFERRAL", "SUBSCRIPTION", "PURCHASED", "ADMIN"] as const;

export type SpendSource = (typeof SOURCE_PRIORITY)[number];

export interface LotView {
  id: string;
  source: SpendSource;
  remaining: number;
  expiresAt: Date | null;
}

export function sortLotsForSpend(lots: LotView[], now: Date): LotView[] {
  return lots
    .filter((lot) => lot.remaining > 0 && (lot.expiresAt === null || lot.expiresAt.getTime() > now.getTime()))
    .slice()
    .sort((a, b) => {
      const aExpiry = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bExpiry = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aExpiry !== bExpiry) return aExpiry - bExpiry;
      return SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source);
    });
}

/** Splits a debit across lots. Returns null when the balance cannot cover it. */
export function planDraw(
  lots: LotView[],
  amount: number,
  now: Date
): { id: string; take: number }[] | null {
  if (!Number.isInteger(amount) || amount < 0) return null;
  if (amount === 0) return [];

  const ordered = sortLotsForSpend(lots, now);
  let left = amount;
  const draws: { id: string; take: number }[] = [];

  for (const lot of ordered) {
    if (left === 0) break;
    const take = Math.min(lot.remaining, left);
    draws.push({ id: lot.id, take });
    left -= take;
  }

  return left === 0 ? draws : null;
}

export function etbPerCredit(price: Prisma.Decimal, credits: number): Prisma.Decimal | null {
  if (!Number.isInteger(credits) || credits <= 0 || price.lte(0)) return null;
  return price.div(credits).toDecimalPlaces(4);
}

/** How much cheaper one subscription credit is than one top-up credit, in percent. */
export function savingsPercent(
  subscriptionPerCredit: Prisma.Decimal,
  topUpPerCredit: Prisma.Decimal
): Prisma.Decimal | null {
  if (topUpPerCredit.lte(0) || subscriptionPerCredit.lte(0)) return null;
  if (subscriptionPerCredit.gte(topUpPerCredit)) return new Prisma.Decimal(0);
  return topUpPerCredit
    .minus(subscriptionPerCredit)
    .div(topUpPerCredit)
    .mul(100)
    .toDecimalPlaces(1);
}

/** Chapa may return "100", "100.00" or 100. Match at two decimal places, no floats. */
export function amountsMatch(expected: Prisma.Decimal, reported: Prisma.Decimal): boolean {
  return expected.toDecimalPlaces(2).equals(reported.toDecimalPlaces(2));
}

export function parseReportedAmount(value: unknown): Prisma.Decimal | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Prisma.Decimal(value.toFixed(2));
  }
  if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return new Prisma.Decimal(value.trim());
  }
  return null;
}

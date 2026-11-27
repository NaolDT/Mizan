import { Prisma } from "@prisma/client";
import type { CustomerSegment } from "@mizan/shared";

export function pointsEarned(amount: Prisma.Decimal, etbPerPoint: Prisma.Decimal): number {
  if (amount.lte(0) || etbPerPoint.lte(0)) return 0;
  return Number(amount.div(etbPerPoint).toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN));
}

export function segmentCustomer(input: {
  outstanding: Prisma.Decimal;
  saleCount: number;
  daysSinceLastPurchase: number | null;
  recentSaleCount: number;
}): CustomerSegment {
  if (input.outstanding.gt(0)) return "OWING";
  if (input.saleCount <= 0) return "NEW";
  if (input.daysSinceLastPurchase == null || input.daysSinceLastPurchase > 30) return "INACTIVE";
  if (input.recentSaleCount >= 3) return "FREQUENT";
  return "REGULAR";
}

export function eatDaysBetween(fromIsoDate: string, toIsoDate: string): number {
  const fromMs = Date.parse(`${fromIsoDate}T00:00:00+03:00`);
  const toMs = Date.parse(`${toIsoDate}T00:00:00+03:00`);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0;
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

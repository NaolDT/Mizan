import { Prisma } from "@prisma/client";
import type { StockCoverConfidence } from "@mizan/shared";

export interface StockCoverInput {
  quantityOnHand: Prisma.Decimal;
  quantitySold: Prisma.Decimal;
  salesCount: number;
  periodDays: number;
}

export interface StockCoverResult {
  dailySalesRate: number | null;
  daysOfCover: number | null;
  coverConfidence: StockCoverConfidence;
}

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

/**
 * Days of cover = on-hand / (quantity sold in the window / period days).
 * Uncertain unless at least two linked sales and three calendar days of history.
 */
export function computeDaysOfCover(input: StockCoverInput): StockCoverResult {
  const periodDays = Math.max(1, Math.floor(input.periodDays));
  if (input.quantitySold.lte(0)) {
    return { dailySalesRate: 0, daysOfCover: null, coverConfidence: "none" };
  }

  const dailyRate = input.quantitySold.div(periodDays);
  const daysOfCover = input.quantityOnHand.div(dailyRate);
  const estimated = input.salesCount >= 2 && periodDays >= 3;

  return {
    dailySalesRate: toNumber2(dailyRate),
    daysOfCover: Number(daysOfCover.toFixed(1)),
    coverConfidence: estimated ? "estimated" : "uncertain",
  };
}

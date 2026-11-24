import type {
  InventoryDemandTrend,
  InventoryMovementClass,
  ReorderReason,
  StockCoverConfidence,
} from "@mizan/shared";

export function classifyMovement(input: {
  quantityOnHand: number;
  quantitySold: number;
  daysSinceLastSale: number | null;
  productAgeDays: number;
  sellerRank: number;
  sellerCount: number;
}): InventoryMovementClass {
  if (input.quantitySold > 0) {
    if (input.sellerCount >= 2 && input.sellerRank >= 1 && input.sellerRank <= 3) {
      return "fast";
    }
    return "ok";
  }
  if (input.quantityOnHand <= 0) return "ok";
  if (input.productAgeDays < 14) return "ok";
  if (input.daysSinceLastSale === null || input.daysSinceLastSale >= 30) return "dead";
  return "slow";
}

export function demandTrend(currentSold: number, previousSold: number): InventoryDemandTrend {
  if (previousSold <= 0 && currentSold <= 0) return "unknown";
  if (previousSold <= 0 && currentSold > 0) return "up";
  if (currentSold <= 0 && previousSold > 0) return "down";
  const ratio = currentSold / previousSold;
  if (ratio >= 1.5) return "up";
  if (ratio <= 2 / 3) return "down";
  return "steady";
}

export function suggestReorder(input: {
  quantityOnHand: number;
  lowStockThreshold: number;
  maxStockLevel: number;
  dailySalesRate: number | null;
  daysOfCover: number | null;
  coverConfidence: StockCoverConfidence;
}): { shouldReorder: boolean; suggestedQty: number | null; reason: ReorderReason | null } {
  const runningOut =
    input.daysOfCover != null &&
    input.coverConfidence !== "none" &&
    input.daysOfCover <= 4;
  const belowThreshold =
    input.lowStockThreshold > 0 && input.quantityOnHand <= input.lowStockThreshold;

  if (!runningOut && !belowThreshold) {
    return { shouldReorder: false, suggestedQty: null, reason: null };
  }

  let target = 0;
  if (input.maxStockLevel > 0) {
    target = input.maxStockLevel;
  } else if (input.dailySalesRate != null && input.dailySalesRate > 0) {
    target = Number((input.dailySalesRate * 7).toFixed(2));
  } else if (input.lowStockThreshold > 0) {
    target = Number((input.lowStockThreshold * 2).toFixed(2));
  }

  const qty = Number(Math.max(0, target - input.quantityOnHand).toFixed(2));
  if (qty <= 0) {
    return { shouldReorder: false, suggestedQty: null, reason: null };
  }

  return {
    shouldReorder: true,
    suggestedQty: qty,
    reason: runningOut ? "cover" : "threshold",
  };
}

export function noticePeriodKey(eatDate: string, kind: string, entityId: string | null): string {
  return `${eatDate}:${kind}:${entityId ?? "_"}`;
}

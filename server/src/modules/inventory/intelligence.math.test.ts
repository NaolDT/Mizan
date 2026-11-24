import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMovement,
  demandTrend,
  noticePeriodKey,
  suggestReorder,
} from "./intelligence.math.js";

test("30 units selling at 10 a day should reorder about a week's cover", () => {
  const result = suggestReorder({
    quantityOnHand: 30,
    lowStockThreshold: 5,
    maxStockLevel: 0,
    dailySalesRate: 10,
    daysOfCover: 3,
    coverConfidence: "estimated",
  });
  assert.equal(result.shouldReorder, true);
  assert.equal(result.reason, "cover");
  assert.equal(result.suggestedQty, 40);
});

test("max stock is the reorder target when configured", () => {
  const result = suggestReorder({
    quantityOnHand: 4,
    lowStockThreshold: 5,
    maxStockLevel: 20,
    dailySalesRate: 1,
    daysOfCover: 4,
    coverConfidence: "estimated",
  });
  assert.equal(result.suggestedQty, 16);
});

test("credit-style stock with no sales is dead after 30 days, not a new product", () => {
  assert.equal(
    classifyMovement({
      quantityOnHand: 12,
      quantitySold: 0,
      daysSinceLastSale: null,
      productAgeDays: 40,
      sellerRank: 0,
      sellerCount: 3,
    }),
    "dead"
  );
  assert.equal(
    classifyMovement({
      quantityOnHand: 12,
      quantitySold: 0,
      daysSinceLastSale: null,
      productAgeDays: 5,
      sellerRank: 0,
      sellerCount: 3,
    }),
    "ok"
  );
  assert.equal(
    classifyMovement({
      quantityOnHand: 8,
      quantitySold: 0,
      daysSinceLastSale: 10,
      productAgeDays: 40,
      sellerRank: 0,
      sellerCount: 3,
    }),
    "slow"
  );
});

test("top sellers among several products are fast-moving", () => {
  assert.equal(
    classifyMovement({
      quantityOnHand: 20,
      quantitySold: 40,
      daysSinceLastSale: 0,
      productAgeDays: 40,
      sellerRank: 1,
      sellerCount: 5,
    }),
    "fast"
  );
});

test("demand trend requires a real increase, not a guess", () => {
  assert.equal(demandTrend(14, 10), "steady");
  assert.equal(demandTrend(20, 10), "up");
  assert.equal(demandTrend(5, 10), "down");
  assert.equal(demandTrend(0, 0), "unknown");
});

test("notice keys are unique per shop-day, kind, and entity", () => {
  assert.equal(noticePeriodKey("2026-11-24", "STOCK_COVER", "p1"), "2026-11-24:STOCK_COVER:p1");
  assert.equal(noticePeriodKey("2026-11-24", "OUTSTANDING", null), "2026-11-24:OUTSTANDING:_");
});

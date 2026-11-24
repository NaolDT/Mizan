import assert from "node:assert/strict";
import test from "node:test";
import type { BusinessInsightsDto, InventoryIntelligenceDto, InventoryIntelligenceItemDto } from "@mizan/shared";
import { composeNoticeDrafts } from "./notices.compose.js";

function item(partial: Partial<InventoryIntelligenceItemDto> & Pick<InventoryIntelligenceItemDto, "productId" | "name">): InventoryIntelligenceItemDto {
  return {
    unit: "pcs",
    quantityOnHand: 4,
    salesCount: 4,
    quantitySold: 20,
    revenue: 2000,
    cogs: null,
    grossProfit: null,
    stockCostValue: null,
    dailySalesRate: 2.8,
    daysOfCover: 1.4,
    coverConfidence: "estimated",
    maxStockLevel: 0,
    lowStockThreshold: 5,
    classification: "ok",
    demandTrend: "steady",
    shouldReorder: true,
    suggestedReorderQty: 16,
    reorderReason: "cover",
    daysSinceLastSale: 0,
    ...partial,
  };
}

test("today's stock-cover notice is keyed once per product", () => {
  const intelligence: InventoryIntelligenceDto = {
    range: "week",
    generatedAtEat: "2026-11-24T12:00:00+03:00",
    items: [],
    reorderSoon: [item({ productId: "p1", name: "Cooking oil" })],
    fastMoving: [],
    slowMoving: [],
    deadStock: [],
    demandUp: [],
  };
  const insights: BusinessInsightsDto = {
    generatedAtEat: "2026-11-24T12:00:00+03:00",
    range: "week",
    items: [],
    lowStockCount: 0,
    customersOwingCount: 0,
    outstandingTotal: 0,
  };
  const drafts = composeNoticeDrafts({ eatDate: "2026-11-24", insights, intelligence });
  const cover = drafts.filter((row) => row.kind === "STOCK_COVER");
  assert.equal(cover.length, 1);
  assert.equal(cover[0]?.periodKey, "2026-11-24:STOCK_COVER:p1");
  assert.equal(cover[0]?.payload.qty, 16);
});

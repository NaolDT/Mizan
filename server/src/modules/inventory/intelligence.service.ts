import { Prisma } from "@prisma/client";
import type {
  DateRangePreset,
  InventoryIntelligenceDto,
  InventoryIntelligenceItemDto,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import {
  countEatDaysBetween,
  formatEatIsoTimestamp,
  getEatDateWindow,
} from "../../utils/eatDate.js";
import { getProductProfitability } from "./inventory.service.js";
import { classifyMovement, demandTrend, suggestReorder } from "./intelligence.math.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function getInventoryIntelligence(
  businessId: string,
  range: Exclude<DateRangePreset, "all"> = "month"
): Promise<InventoryIntelligenceDto> {
  const window = getEatDateWindow(range);
  const [profits, products, lastSales, previousSales] = await Promise.all([
    getProductProfitability(businessId, range),
    prisma.product.findMany({
      where: { businessId },
      select: {
        id: true,
        createdAt: true,
        lowStockThreshold: true,
        maxStockLevel: true,
      },
    }),
    prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { businessId, reason: "SALE" },
      _max: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        type: "INCOME",
        productId: { not: null },
        transactionDate: {
          gte: window.previousStartUtc,
          lte: window.previousEndUtc,
        },
      },
      select: { productId: true, quantity: true },
    }),
  ]);

  const productMeta = new Map(products.map((row) => [row.id, row]));
  const lastSaleAt = new Map(
    lastSales.map((row) => [row.productId, row._max.createdAt ?? null])
  );
  const previousQty = new Map<string, Prisma.Decimal>();
  for (const row of previousSales) {
    if (!row.productId) continue;
    const current = previousQty.get(row.productId) ?? new Prisma.Decimal(0);
    previousQty.set(row.productId, current.plus(row.quantity ?? 0));
  }

  const sellers = profits
    .filter((row) => row.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold);
  const rankById = new Map(sellers.map((row, index) => [row.productId, index + 1]));

  const items: InventoryIntelligenceItemDto[] = profits.map((row) => {
    const meta = productMeta.get(row.productId);
    const lastAt = lastSaleAt.get(row.productId) ?? null;
    const daysSinceLastSale = lastAt ? countEatDaysBetween(lastAt) : null;
    const productAgeDays = meta ? countEatDaysBetween(meta.createdAt) : 0;
    const lowStockThreshold = meta ? toNumber2(meta.lowStockThreshold) : 0;
    const maxStockLevel = meta ? toNumber2(meta.maxStockLevel) : 0;
    const reorder = suggestReorder({
      quantityOnHand: row.quantityOnHand,
      lowStockThreshold,
      maxStockLevel,
      dailySalesRate: row.dailySalesRate,
      daysOfCover: row.daysOfCover,
      coverConfidence: row.coverConfidence,
    });
    return {
      ...row,
      maxStockLevel,
      lowStockThreshold,
      classification: classifyMovement({
        quantityOnHand: row.quantityOnHand,
        quantitySold: row.quantitySold,
        daysSinceLastSale,
        productAgeDays,
        sellerRank: rankById.get(row.productId) ?? 0,
        sellerCount: sellers.length,
      }),
      demandTrend: demandTrend(
        row.quantitySold,
        toNumber2(previousQty.get(row.productId) ?? new Prisma.Decimal(0))
      ),
      shouldReorder: reorder.shouldReorder,
      suggestedReorderQty: reorder.suggestedQty,
      reorderReason: reorder.reason,
      daysSinceLastSale,
    };
  });

  return {
    range,
    generatedAtEat: formatEatIsoTimestamp(),
    items,
    reorderSoon: items.filter((row) => row.shouldReorder).slice(0, 8),
    fastMoving: items.filter((row) => row.classification === "fast").slice(0, 8),
    slowMoving: items.filter((row) => row.classification === "slow").slice(0, 8),
    deadStock: items.filter((row) => row.classification === "dead").slice(0, 8),
    demandUp: items.filter((row) => row.demandTrend === "up").slice(0, 8),
  };
}

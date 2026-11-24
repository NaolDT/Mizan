import assert from "node:assert/strict";
import test from "node:test";
import type {
  BusinessInsightsDto,
  CashFlowDto,
  FinancialSummaryDto,
  InventoryValuationDto,
  ProductProfitabilityDto,
} from "@mizan/shared";
import { composeAdvisorReport } from "./advisor.compose.js";

function summary(partial: Partial<FinancialSummaryDto["period"]> & { transactionCount: number }): FinancialSummaryDto {
  return {
    currency: "ETB",
    range: "week",
    generatedAtEat: "2026-11-24T12:00:00+03:00",
    today: { income: 0, expense: 0, netProfit: 0, transactionCount: 0 },
    period: {
      income: 0,
      expense: 0,
      operatingProfitExclInventory: 0,
      inventoryPurchases: 0,
      netCashFlow: 0,
      creditReceivableTotal: 0,
      vsPreviousIncomePct: null,
      vsPreviousExpensePct: null,
      ...partial,
    },
    byCategory: [],
    byPaymentMethod: [],
    dailySeries: [],
  };
}

function cashFlow(partial: Partial<CashFlowDto>): CashFlowDto {
  return {
    currency: "ETB",
    range: "week",
    generatedAtEat: "2026-11-24T12:00:00+03:00",
    periodDays: 7,
    cashIn: 0,
    telebirrIn: 0,
    bankIn: 0,
    creditSales: 0,
    collections: 0,
    cashOut: 0,
    telebirrOut: 0,
    bankOut: 0,
    creditPurchases: 0,
    collectedIn: 0,
    spent: 0,
    netCashMovement: 0,
    outstanding: 0,
    customersOwingCount: 0,
    dailySeries: [],
    ...partial,
  };
}

const emptyInsights: BusinessInsightsDto = {
  generatedAtEat: "2026-11-24T12:00:00+03:00",
  range: "week",
  items: [],
  lowStockCount: 0,
  customersOwingCount: 0,
  outstandingTotal: 0,
};

const emptyValuation: InventoryValuationDto = { productCount: 0, costValue: 0, retailValue: 0 };

test("insufficient records do not invent recommendations", () => {
  const report = composeAdvisorReport({
    language: "en",
    summary: summary({ transactionCount: 1, income: 100 }),
    cashFlow: cashFlow({ cashIn: 100, collectedIn: 100, netCashMovement: 100 }),
    insights: emptyInsights,
    profits: [],
    lowStock: [],
    valuation: emptyValuation,
  });
  assert.equal(report.dataSufficient, false);
  assert.equal(report.overview.id, "overview-need-data");
  assert.equal(report.actions[0]?.id, "action-record-more");
  assert.equal(report.metrics.cashCollected, 100);
  assert.equal(report.metrics.income, 100);
});

test("credit sales stay separate from cash collected in the briefing", () => {
  const oil: ProductProfitabilityDto = {
    productId: "p1",
    name: "Cooking oil",
    unit: "pcs",
    quantityOnHand: 8,
    salesCount: 4,
    quantitySold: 20,
    revenue: 2000,
    cogs: 1200,
    grossProfit: 800,
    stockCostValue: 480,
    dailySalesRate: 2.86,
    daysOfCover: 2.8,
    coverConfidence: "estimated",
  };
  const report = composeAdvisorReport({
    language: "en",
    summary: summary({
      transactionCount: 8,
      income: 2500,
      expense: 400,
      netCashFlow: 2100,
    }),
    cashFlow: cashFlow({
      cashIn: 500,
      creditSales: 2000,
      collections: 0,
      collectedIn: 500,
      spent: 400,
      netCashMovement: 100,
      outstanding: 2000,
      customersOwingCount: 2,
    }),
    insights: {
      ...emptyInsights,
      items: [{ id: "credit-outstanding", severity: "warning", title: "Owed", body: "2 customers" }],
    },
    profits: [oil],
    lowStock: [],
    valuation: { productCount: 1, costValue: 480, retailValue: 800 },
  });

  assert.equal(report.dataSufficient, true);
  assert.match(report.overview.body, /2,000 ETB are still not cash/);
  assert.equal(report.metrics.cashCollected, 500);
  assert.equal(report.metrics.creditSales, 2000);
  assert.ok(report.actions.some((item) => item.id === "action-stock-cover"));
  assert.ok(report.actions.some((item) => item.id === "action-collect"));
  assert.equal(report.products.best?.name, "Cooking oil");
});

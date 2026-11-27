import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { accumulateCashFlow, serializeCashTotals } from "./cashflow.math.js";

function d(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test("a credit sale is not cash collected", () => {
  const { totals } = accumulateCashFlow({
    transactions: [
      {
        type: "INCOME",
        paymentMethod: "CREDIT",
        amount: d("1000.00"),
        transactionDate: new Date("2026-11-24T08:00:00Z"),
      },
      {
        type: "INCOME",
        paymentMethod: "CASH",
        amount: d("250.50"),
        transactionDate: new Date("2026-11-24T09:00:00Z"),
      },
    ],
    collections: [],
    dateKeys: ["2026-11-24"],
    formatDateKey: dateKey,
  });

  const serialized = serializeCashTotals(totals);
  assert.equal(serialized.creditSales, 1000);
  assert.equal(serialized.cashIn, 250.5);
  assert.equal(serialized.collectedIn, 250.5);
  assert.equal(serialized.netCashMovement, 250.5);
});

test("customer debt collection is cash in, not new revenue", () => {
  const { totals, dailySeries } = accumulateCashFlow({
    transactions: [
      {
        type: "INCOME",
        paymentMethod: "CREDIT",
        amount: d("400.00"),
        transactionDate: new Date("2026-11-20T08:00:00Z"),
      },
    ],
    collections: [{ amount: d("-150.00"), createdAt: new Date("2026-11-24T11:00:00Z") }],
    dateKeys: ["2026-11-24"],
    formatDateKey: dateKey,
  });

  const serialized = serializeCashTotals(totals);
  assert.equal(serialized.creditSales, 400);
  assert.equal(serialized.collections, 150);
  assert.equal(serialized.collectedIn, 150);
  assert.equal(serialized.netCashMovement, 150);
  assert.equal(dailySeries[0]?.collected, 150);
});

test("credit purchases do not reduce cash, digital outflows do", () => {
  const { totals } = accumulateCashFlow({
    transactions: [
      {
        type: "INCOME",
        paymentMethod: "TELEBIRR",
        amount: d("500.00"),
        transactionDate: new Date("2026-11-24T08:00:00Z"),
      },
      {
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: d("200.00"),
        transactionDate: new Date("2026-11-24T09:00:00Z"),
      },
      {
        type: "EXPENSE",
        paymentMethod: "BANK",
        amount: d("80.00"),
        transactionDate: new Date("2026-11-24T10:00:00Z"),
      },
    ],
    collections: [],
    dateKeys: ["2026-11-24"],
    formatDateKey: dateKey,
  });

  const serialized = serializeCashTotals(totals);
  assert.equal(serialized.creditPurchases, 200);
  assert.equal(serialized.bankOut, 80);
  assert.equal(serialized.spent, 80);
  assert.equal(serialized.collectedIn, 500);
  assert.equal(serialized.netCashMovement, 420);
});

test("paying a supplier reduces cash without a second expense", () => {
  const { totals, dailySeries } = accumulateCashFlow({
    transactions: [
      {
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: d("300.00"),
        transactionDate: new Date("2026-11-20T08:00:00Z"),
      },
    ],
    collections: [],
    supplierPayments: [{ amount: d("-120.00"), createdAt: new Date("2026-11-24T11:00:00Z") }],
    dateKeys: ["2026-11-24"],
    formatDateKey: dateKey,
  });

  const serialized = serializeCashTotals(totals);
  assert.equal(serialized.creditPurchases, 300);
  assert.equal(serialized.spent, 120);
  assert.equal(serialized.netCashMovement, -120);
  assert.equal(dailySeries[0]?.spent, 120);
});

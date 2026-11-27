import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { eatDaysBetween, pointsEarned, segmentCustomer } from "./customer.intel.math.js";

function d(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

test("loyalty points use floor division of spend over the configured ETB per point", () => {
  assert.equal(pointsEarned(d("250.00"), d("100.00")), 2);
  assert.equal(pointsEarned(d("99.99"), d("100.00")), 0);
  assert.equal(pointsEarned(d("100.00"), d("0")), 0);
});

test("owing customers stay owing even if they also buy often", () => {
  assert.equal(
    segmentCustomer({
      outstanding: d("40.00"),
      saleCount: 8,
      daysSinceLastPurchase: 2,
      recentSaleCount: 5,
    }),
    "OWING"
  );
});

test("inactive is 31 days without a purchase; frequent is three recent settled sales", () => {
  assert.equal(
    segmentCustomer({
      outstanding: d(0),
      saleCount: 4,
      daysSinceLastPurchase: 31,
      recentSaleCount: 0,
    }),
    "INACTIVE"
  );
  assert.equal(
    segmentCustomer({
      outstanding: d(0),
      saleCount: 4,
      daysSinceLastPurchase: 5,
      recentSaleCount: 3,
    }),
    "FREQUENT"
  );
  assert.equal(
    segmentCustomer({
      outstanding: d(0),
      saleCount: 0,
      daysSinceLastPurchase: null,
      recentSaleCount: 0,
    }),
    "NEW"
  );
});

test("EAT calendar day gap is whole days, not UTC midnight", () => {
  assert.equal(eatDaysBetween("2026-11-01", "2026-12-01"), 30);
});

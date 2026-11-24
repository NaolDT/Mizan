import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { computeDaysOfCover } from "./stockCover.js";

function d(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

test("30 units at 10 per day lasts three days", () => {
  const cover = computeDaysOfCover({
    quantityOnHand: d(30),
    quantitySold: d(70),
    salesCount: 7,
    periodDays: 7,
  });
  assert.equal(cover.dailySalesRate, 10);
  assert.equal(cover.daysOfCover, 3);
  assert.equal(cover.coverConfidence, "estimated");
});

test("a single sale is marked uncertain", () => {
  const cover = computeDaysOfCover({
    quantityOnHand: d(10),
    quantitySold: d(2),
    salesCount: 1,
    periodDays: 7,
  });
  assert.equal(cover.coverConfidence, "uncertain");
  assert.equal(cover.daysOfCover, 35);
});

test("no sales yields no day count", () => {
  const cover = computeDaysOfCover({
    quantityOnHand: d(12),
    quantitySold: d(0),
    salesCount: 0,
    periodDays: 7,
  });
  assert.equal(cover.dailySalesRate, 0);
  assert.equal(cover.daysOfCover, null);
  assert.equal(cover.coverConfidence, "none");
});

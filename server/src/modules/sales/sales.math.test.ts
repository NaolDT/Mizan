import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { applyOrderDiscount, lineSaleAmount } from "./sales.math.js";

function d(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

test("a cart line uses catalog unit price times quantity", () => {
  assert.equal(lineSaleAmount(d("25.50"), d(2)).toFixed(2), "51.00");
});

test("an order discount comes off later lines and never wipes a line to zero", () => {
  const discounted = applyOrderDiscount([d("40.00"), d("60.00")], d("15.00"));
  assert.equal(discounted[0].toFixed(2), "40.00");
  assert.equal(discounted[1].toFixed(2), "45.00");
});

test("a discount larger than the reducible remainder is rejected", () => {
  assert.throws(() => applyOrderDiscount([d("10.00")], d("10.00")));
});

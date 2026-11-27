import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  nextPurchaseStatus,
  purchaseLineAmount,
  receiveQuantity,
  remainingToReceive,
} from "./purchases.math.js";

function d(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

test("ordering does not receive stock; remaining equals ordered", () => {
  assert.equal(remainingToReceive(d(10), d(0)).toFixed(2), "10.00");
});

test("a receive cannot exceed the unordered remainder", () => {
  assert.equal(receiveQuantity(d(10), d(4), d(20)).toFixed(2), "6.00");
  assert.equal(receiveQuantity(d(10), d(10), d(1)).toFixed(2), "0.00");
});

test("line cost uses recorded unit cost, not the current catalog price", () => {
  assert.equal(purchaseLineAmount(d("12.50"), d(4)).toFixed(2), "50.00");
});

test("status stays ordered until something is received", () => {
  const items = [{ quantityOrdered: d(5), quantityReceived: d(0) }];
  assert.equal(nextPurchaseStatus(items, "ORDERED"), "ORDERED");
  assert.equal(nextPurchaseStatus([{ quantityOrdered: d(5), quantityReceived: d(2) }], "ORDERED"), "PARTIAL");
  assert.equal(nextPurchaseStatus([{ quantityOrdered: d(5), quantityReceived: d(5) }], "PARTIAL"), "RECEIVED");
  assert.equal(nextPurchaseStatus(items, "CANCELLED"), "CANCELLED");
});

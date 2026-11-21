import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  amountsMatch,
  etbPerCredit,
  parseReportedAmount,
  planDraw,
  savingsPercent,
  sortLotsForSpend,
  type LotView,
} from "./credit.policy.js";

const now = new Date("2026-11-21T12:00:00Z");

function lot(partial: Partial<LotView> & Pick<LotView, "id" | "source">): LotView {
  return { remaining: 10, expiresAt: null, ...partial };
}

test("soonest expiry is spent first, then promotional credits", () => {
  const ordered = sortLotsForSpend(
    [
      lot({ id: "purchased", source: "PURCHASED", expiresAt: new Date("2026-12-01T00:00:00Z") }),
      lot({ id: "promo", source: "PROMO", expiresAt: new Date("2026-11-25T00:00:00Z") }),
      lot({ id: "referral", source: "REFERRAL", expiresAt: new Date("2026-11-25T00:00:00Z") }),
      lot({ id: "expired", source: "PROMO", expiresAt: new Date("2026-11-01T00:00:00Z"), remaining: 50 }),
    ],
    now
  );

  assert.deepEqual(
    ordered.map((item) => item.id),
    ["promo", "referral", "purchased"]
  );
});

test("a draw never spends more than the lot and fails closed when short", () => {
  const lots = [
    lot({ id: "a", source: "PROMO", remaining: 3, expiresAt: new Date("2026-11-22T00:00:00Z") }),
    lot({ id: "b", source: "PURCHASED", remaining: 4 }),
  ];

  assert.deepEqual(planDraw(lots, 5, now), [
    { id: "a", take: 3 },
    { id: "b", take: 2 },
  ]);
  assert.equal(planDraw(lots, 8, now), null);
  assert.equal(planDraw(lots, -1, now), null);
});

test("subscription value and payment amounts use decimal arithmetic", () => {
  const sub = etbPerCredit(new Prisma.Decimal("399"), 900);
  const top = etbPerCredit(new Prisma.Decimal("50"), 40);
  assert.ok(sub && top);
  assert.equal(sub.toFixed(4), "0.4433");
  assert.equal(top.toFixed(4), "1.2500");

  const saved = savingsPercent(sub, top);
  assert.equal(saved?.toFixed(1), "64.5");
  assert.equal(etbPerCredit(new Prisma.Decimal(0), 10), null);

  assert.equal(amountsMatch(new Prisma.Decimal("100.00"), parseReportedAmount("100")!), true);
  assert.equal(amountsMatch(new Prisma.Decimal("100.00"), parseReportedAmount(100)!), true);
  assert.equal(amountsMatch(new Prisma.Decimal("100.00"), parseReportedAmount("100.01")!), false);
  assert.equal(parseReportedAmount("100.001"), null);
  assert.equal(parseReportedAmount("10abc"), null);
});

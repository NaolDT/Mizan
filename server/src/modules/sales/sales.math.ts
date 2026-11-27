import { Prisma } from "@prisma/client";

export function lineSaleAmount(unitPrice: Prisma.Decimal, quantity: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(unitPrice.mul(quantity).toFixed(2));
}

/**
 * Subtract an order-level discount from the last lines first, keeping each
 * remaining line at least 0.01 ETB so stock still moves with a recorded sale.
 */
export function applyOrderDiscount(
  lineAmounts: Prisma.Decimal[],
  discount: Prisma.Decimal
): Prisma.Decimal[] {
  const minKeep = new Prisma.Decimal("0.01");
  const out = lineAmounts.map((amount) => new Prisma.Decimal(amount.toFixed(2)));
  let left = new Prisma.Decimal(discount.toFixed(2));
  if (left.lte(0)) return out;

  for (let i = out.length - 1; i >= 0 && left.gt(0); i -= 1) {
    const reducible = out[i].minus(minKeep);
    if (reducible.lte(0)) continue;
    const take = reducible.lt(left) ? reducible : left;
    out[i] = out[i].minus(take);
    left = left.minus(take);
  }

  if (left.gt(0)) {
    throw new Error("DISCOUNT_TOO_LARGE");
  }
  return out;
}

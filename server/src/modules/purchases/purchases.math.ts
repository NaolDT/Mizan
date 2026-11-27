import { Prisma } from "@prisma/client";
import type { PurchaseOrderStatus } from "@mizan/shared";

export function remainingToReceive(ordered: Prisma.Decimal, received: Prisma.Decimal): Prisma.Decimal {
  const left = ordered.minus(received);
  return left.gt(0) ? left : new Prisma.Decimal(0);
}

export function receiveQuantity(
  ordered: Prisma.Decimal,
  received: Prisma.Decimal,
  incoming: Prisma.Decimal
): Prisma.Decimal {
  if (incoming.lte(0)) return new Prisma.Decimal(0);
  const left = remainingToReceive(ordered, received);
  return incoming.gt(left) ? left : incoming;
}

export function purchaseLineAmount(unitCost: Prisma.Decimal, quantity: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(unitCost.mul(quantity).toFixed(2));
}

export function nextPurchaseStatus(
  items: Array<{ quantityOrdered: Prisma.Decimal; quantityReceived: Prisma.Decimal }>,
  current: PurchaseOrderStatus
): PurchaseOrderStatus {
  if (current === "CANCELLED") return "CANCELLED";
  if (items.length === 0) return "ORDERED";
  const allReceived = items.every((item) => item.quantityReceived.gte(item.quantityOrdered) && item.quantityOrdered.gt(0));
  const anyReceived = items.some((item) => item.quantityReceived.gt(0));
  if (allReceived) return "RECEIVED";
  if (anyReceived) return "PARTIAL";
  return "ORDERED";
}

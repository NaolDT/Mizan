import { Prisma } from "@prisma/client";
import type { RedeemShopLoyaltyRequest, ShopLoyaltyEntryDto } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { pointsEarned } from "./customer.intel.math.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function getLoyaltyPoints(businessId: string, customerId: string): Promise<number> {
  const result = await prisma.shopLoyaltyLedger.aggregate({
    where: { businessId, customerId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

export async function listLoyalty(
  businessId: string,
  customerId: string
): Promise<ShopLoyaltyEntryDto[]> {
  const rows = await prisma.shopLoyaltyLedger.findMany({
    where: { businessId, customerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    points: row.points,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function earnLoyaltyForSale(
  businessId: string,
  customerId: string,
  transactionId: string,
  amount: Prisma.Decimal
): Promise<void> {
  const business = await prisma.business.findFirst({
    where: { id: businessId },
    select: { loyaltyEnabled: true, loyaltyEtbPerPoint: true },
  });
  if (!business?.loyaltyEnabled) return;

  const points = pointsEarned(amount, business.loyaltyEtbPerPoint);
  if (points <= 0) return;

  const sourceKey = `earn:${transactionId}`;
  const existing = await prisma.shopLoyaltyLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (existing) return;

  await prisma.shopLoyaltyLedger.create({
    data: {
      businessId,
      customerId,
      type: "EARN",
      points,
      note: `Earned on sale of ${toNumber2(amount)} ETB`,
      sourceKey,
      transactionId,
    },
  });
}

export async function reverseLoyaltyForTransaction(
  businessId: string,
  transactionId: string
): Promise<void> {
  const earned = await prisma.shopLoyaltyLedger.findFirst({
    where: { businessId, transactionId, type: "EARN" },
  });
  if (!earned) return;

  const sourceKey = `void:${transactionId}`;
  const existing = await prisma.shopLoyaltyLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (existing) return;

  await prisma.shopLoyaltyLedger.create({
    data: {
      businessId,
      customerId: earned.customerId,
      type: "REVERSAL",
      points: -earned.points,
      note: "Voided sale",
      sourceKey,
      transactionId,
    },
  });
}

export async function redeemLoyalty(
  businessId: string,
  customerId: string,
  input: RedeemShopLoyaltyRequest
): Promise<{ loyaltyPoints: number }> {
  if (!Number.isInteger(input.points) || input.points <= 0) {
    throw new AppError(400, "INVALID_POINTS", "Redeem a whole number of points greater than 0");
  }
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const sourceKey = `redeem:${input.idempotencyKey}`;
  const duplicate = await prisma.shopLoyaltyLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (duplicate) return { loyaltyPoints: await getLoyaltyPoints(businessId, customerId) };

  const balance = await getLoyaltyPoints(businessId, customerId);
  if (input.points > balance) {
    throw new AppError(400, "POINTS_EXCEED_BALANCE", "Not enough loyalty points");
  }

  await prisma.shopLoyaltyLedger.create({
    data: {
      businessId,
      customerId,
      type: "REDEEM",
      points: -input.points,
      note: input.note?.trim() || "Redeemed in shop",
      sourceKey,
    },
  });

  return { loyaltyPoints: await getLoyaltyPoints(businessId, customerId) };
}

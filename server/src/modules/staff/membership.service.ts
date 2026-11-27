import type { ShopRole } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";

export type ShopAccess = {
  businessId: string;
  shopRole: ShopRole;
};

export async function ensureOwnerMembership(businessId: string, userId: string): Promise<void> {
  await prisma.businessMembership.upsert({
    where: { businessId_userId: { businessId, userId } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { businessId, userId, role: "OWNER", status: "ACTIVE" },
  });
}

export async function resolveShopAccess(
  userId: string,
  preferredBusinessId?: string
): Promise<ShopAccess> {
  if (preferredBusinessId) {
    const membership = await prisma.businessMembership.findFirst({
      where: { userId, businessId: preferredBusinessId, status: "ACTIVE" },
    });
    if (membership) {
      return { businessId: membership.businessId, shopRole: membership.role };
    }
    const owned = await prisma.business.findFirst({
      where: { id: preferredBusinessId, ownerId: userId },
      select: { id: true },
    });
    if (owned) {
      await ensureOwnerMembership(owned.id, userId);
      return { businessId: owned.id, shopRole: "OWNER" };
    }
    throw new AppError(403, "FORBIDDEN", "You do not have access to this shop");
  }

  const membership = await prisma.businessMembership.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (membership) {
    return { businessId: membership.businessId, shopRole: membership.role };
  }

  const owned = await prisma.business.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!owned) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "No business profile found for this account");
  }
  await ensureOwnerMembership(owned.id, userId);
  return { businessId: owned.id, shopRole: "OWNER" };
}

import { Prisma } from "@prisma/client";
import type { BusinessDto, UpdateBusinessRequest } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { mapBusinessDto } from "../auth/auth.service.js";

export async function getBusinessById(
  businessId: string
): Promise<BusinessDto> {
  const business = await prisma.business.findFirst({
    where: { id: businessId },
  });

  if (!business) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  }

  return mapBusinessDto(business);
}

export async function updateBusinessProfile(
  businessId: string,
  actorUserId: string,
  input: UpdateBusinessRequest
): Promise<BusinessDto> {
  const existing = await prisma.business.findFirst({
    where: { id: businessId },
  });

  if (!existing) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedBiz = await tx.business.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.location !== undefined
          ? { location: input.location?.trim() || null }
          : {}),
        ...(input.preferredLanguage !== undefined
          ? { preferredLanguage: input.preferredLanguage }
          : {}),
        ...(input.loyaltyEnabled !== undefined ? { loyaltyEnabled: input.loyaltyEnabled } : {}),
        ...(input.loyaltyEtbPerPoint !== undefined
          ? { loyaltyEtbPerPoint: new Prisma.Decimal(input.loyaltyEtbPerPoint.toFixed(2)) }
          : {}),
      },
    });

    if (input.preferredLanguage !== undefined && actorUserId === existing.ownerId) {
      await tx.user.update({
        where: { id: actorUserId },
        data: { preferredLanguage: input.preferredLanguage },
      });
    }

    return updatedBiz;
  });

  const { recordAudit } = await import("../staff/audit.service.js");
  await recordAudit({
    businessId,
    actorUserId,
    action: "UPDATE_BUSINESS",
    entityType: "BUSINESS",
    entityId: updated.id,
    summary: "Updated shop settings",
  });

  return mapBusinessDto(updated);
}

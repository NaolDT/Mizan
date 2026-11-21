import type { BusinessDto, UpdateBusinessRequest } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { mapBusinessDto } from "../auth/auth.service.js";

export async function getBusinessById(
  businessId: string,
  ownerId: string
): Promise<BusinessDto> {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  }

  return mapBusinessDto(business);
}

export async function updateBusinessProfile(
  businessId: string,
  ownerId: string,
  input: UpdateBusinessRequest
): Promise<BusinessDto> {
  const existing = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
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
      },
    });

    if (input.preferredLanguage !== undefined) {
      await tx.user.update({
        where: { id: ownerId },
        data: { preferredLanguage: input.preferredLanguage },
      });
    }

    return updatedBiz;
  });

  return mapBusinessDto(updated);
}

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/apiResponse.js";

/**
 * Resolves the authenticated user's owned Business from PostgreSQL and binds
 * `req.tenant = { userId, businessId }`.
 *
 * Security Mandate (AGENTS.md): NEVER trust a `businessId` from body/query/LLM;
 * always verify ownership against `users.id` here.
 */
export async function requireTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.auth?.userId) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const headerBusinessId =
      typeof req.headers["x-business-id"] === "string"
        ? req.headers["x-business-id"].trim()
        : undefined;

    const business = headerBusinessId
      ? await prisma.business.findFirst({
          where: {
            id: headerBusinessId,
            ownerId: req.auth.userId,
          },
          select: { id: true },
        })
      : await prisma.business.findFirst({
          where: {
            ownerId: req.auth.userId,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

    if (!business) {
      throw new AppError(
        404,
        "BUSINESS_NOT_FOUND",
        "No business profile found for this account"
      );
    }

    req.tenant = {
      userId: req.auth.userId,
      businessId: business.id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

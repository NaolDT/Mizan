import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/apiResponse.js";
import { resolveShopAccess } from "../modules/staff/membership.service.js";

/**
 * Resolves the authenticated user's shop from membership (or owned-business
 * fallback) and binds `req.tenant = { userId, businessId, shopRole }`.
 *
 * Security Mandate (AGENTS.md): NEVER trust a `businessId` from body/query/LLM;
 * only `x-business-id` is accepted, and only after membership is verified.
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

    const access = await resolveShopAccess(req.auth.userId, headerBusinessId || undefined);
    req.tenant = {
      userId: req.auth.userId,
      businessId: access.businessId,
      shopRole: access.shopRole,
    };

    next();
  } catch (err) {
    next(err);
  }
}

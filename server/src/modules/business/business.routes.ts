import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getBusinessById, updateBusinessProfile } from "./business.service.js";

export const businessRouter = Router();

businessRouter.use(requireAuth, requireTenant);

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(140).optional(),
  category: z
    .enum([
      "RETAIL",
      "GROCERY",
      "CAFE_RESTAURANT",
      "TRADER",
      "WHOLESALE",
      "SERVICE",
      "OTHER",
    ])
    .optional(),
  location: z.string().max(140).nullable().optional(),
  preferredLanguage: z.enum(["am", "om", "en"]).optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyEtbPerPoint: z.number().positive().max(1_000_000).optional(),
});

businessRouter.get("/current", async (req, res, next) => {
  try {
    const business = await getBusinessById(req.tenant!.businessId, req.tenant!.userId);
    sendSuccess(res, business);
  } catch (err) {
    next(err);
  }
});

businessRouter.patch("/current", async (req, res, next) => {
  try {
    const body = updateBusinessSchema.parse(req.body);
    const updated = await updateBusinessProfile(
      req.tenant!.businessId,
      req.tenant!.userId,
      body
    );
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

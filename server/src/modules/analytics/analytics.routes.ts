import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getFinancialSummary } from "./analytics.service.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireTenant);

const summaryQuerySchema = z.object({
  range: z.enum(["today", "week", "month"]).default("month"),
});

analyticsRouter.get("/summary", async (req, res, next) => {
  try {
    const { range } = summaryQuerySchema.parse(req.query);
    const summary = await getFinancialSummary(req.tenant!.businessId, range);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

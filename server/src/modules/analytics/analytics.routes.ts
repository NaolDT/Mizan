import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  getAdvisorReport,
  getBusinessInsights,
  getCashFlow,
  getFinancialSummary,
} from "./analytics.service.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireTenant);

const summaryQuerySchema = z.object({
  range: z.enum(["today", "week", "month"]).default("month"),
});

const insightsQuerySchema = summaryQuerySchema.extend({
  language: z.enum(["am", "om", "en"]).optional(),
});

analyticsRouter.get("/insights", async (req, res, next) => {
  try {
    const { range, language } = insightsQuerySchema.parse(req.query);
    sendSuccess(res, await getBusinessInsights(req.tenant!.businessId, range, language ?? "en"));
  } catch (err) {
    next(err);
  }
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

analyticsRouter.get("/cash-flow", async (req, res, next) => {
  try {
    const { range } = summaryQuerySchema.parse(req.query);
    sendSuccess(res, await getCashFlow(req.tenant!.businessId, range));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/advisor", async (req, res, next) => {
  try {
    const { range, language } = insightsQuerySchema.parse(req.query);
    sendSuccess(res, await getAdvisorReport(req.tenant!.businessId, range, language ?? "en"));
  } catch (err) {
    next(err);
  }
});

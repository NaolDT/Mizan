import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  buyVoicePack,
  changePlan,
  getSubscriptionSummary,
} from "./subscription.service.js";

export const subscriptionRouter = Router();

subscriptionRouter.use(requireAuth, requireTenant);

const changePlanSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]),
});

subscriptionRouter.get("/", async (req, res, next) => {
  try {
    sendSuccess(res, await getSubscriptionSummary(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.post("/plan", async (req, res, next) => {
  try {
    const body = changePlanSchema.parse(req.body);
    sendSuccess(res, await changePlan(req.tenant!.businessId, body.plan));
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.post("/voice-pack", async (req, res, next) => {
  try {
    sendSuccess(res, await buyVoicePack(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

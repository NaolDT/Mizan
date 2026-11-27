import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRewardSummary, redeemReward } from "./rewards.service.js";

export const rewardsRouter = Router();

rewardsRouter.use(requireAuth, requireTenant, requirePermission("manage_billing"));

const redeemSchema = z.object({
  option: z.enum(["EXTRA_VOICE", "DISCOUNT_10", "STARTER_WEEK"]),
});

rewardsRouter.get("/", async (req, res, next) => {
  try {
    const { userId, businessId } = req.tenant!;
    sendSuccess(res, await getRewardSummary(userId, businessId));
  } catch (err) {
    next(err);
  }
});

rewardsRouter.post("/redeem", async (req, res, next) => {
  try {
    const body = redeemSchema.parse(req.body);
    const { userId, businessId } = req.tenant!;
    sendSuccess(res, await redeemReward(userId, businessId, body.option));
  } catch (err) {
    next(err);
  }
});

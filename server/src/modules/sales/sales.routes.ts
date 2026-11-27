import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { checkoutSale } from "./sales.service.js";

export const salesRouter = Router();

salesRouter.use(requireAuth, requireTenant);

const checkoutSchema = z.object({
  idempotencyKey: z.string().min(4).max(80),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  customerId: z.string().uuid().nullable().optional(),
  counterpartyName: z.string().max(120).nullable().optional(),
  discountAmount: z.number().min(0).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
      })
    )
    .min(1),
});

salesRouter.post("/checkout", async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await checkoutSale(req.tenant!.businessId, req.tenant!.userId, checkoutSchema.parse(req.body)),
      201
    );
  } catch (err) {
    next(err);
  }
});

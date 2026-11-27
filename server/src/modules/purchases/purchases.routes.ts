import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
} from "./purchases.service.js";

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth, requireTenant, requirePermission("manage_purchases"));

const createSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().max(280).optional().nullable(),
  idempotencyKey: z.string().min(4).max(80),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCost: z.number().positive(),
      })
    )
    .min(1),
});

const receiveSchema = z.object({
  idempotencyKey: z.string().min(4).max(80),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().positive(),
      })
    )
    .min(1),
});

function paramId(req: { params: { id?: string | string[] } }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value ?? "";
}

purchasesRouter.get("/", async (req, res, next) => {
  try {
    sendSuccess(res, await listPurchaseOrders(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

purchasesRouter.get("/:id", async (req, res, next) => {
  try {
    sendSuccess(res, await getPurchaseOrder(req.tenant!.businessId, paramId(req)));
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post("/", async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await createPurchaseOrder(req.tenant!.businessId, req.tenant!.userId, createSchema.parse(req.body)),
      201
    );
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    sendSuccess(res, await cancelPurchaseOrder(req.tenant!.businessId, paramId(req)));
  } catch (err) {
    next(err);
  }
});

purchasesRouter.post("/:id/receive", async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await receivePurchaseOrder(
        req.tenant!.businessId,
        req.tenant!.userId,
        paramId(req),
        receiveSchema.parse(req.body)
      )
    );
  } catch (err) {
    next(err);
  }
});

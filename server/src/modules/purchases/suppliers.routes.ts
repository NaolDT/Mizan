import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  recordSupplierPayment,
  updateSupplier,
} from "./suppliers.service.js";

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth, requireTenant, requirePermission("manage_purchases"));

const createSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(24).optional().nullable(),
  notes: z.string().max(280).optional().nullable(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().min(4).max(80),
});

function paramId(req: { params: { id?: string | string[] } }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value ?? "";
}

suppliersRouter.get("/", async (req, res, next) => {
  try {
    sendSuccess(res, await listSuppliers(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

suppliersRouter.get("/:id", async (req, res, next) => {
  try {
    sendSuccess(res, await getSupplier(req.tenant!.businessId, paramId(req)));
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post("/", async (req, res, next) => {
  try {
    sendSuccess(res, await createSupplier(req.tenant!.businessId, createSchema.parse(req.body)), 201);
  } catch (err) {
    next(err);
  }
});

suppliersRouter.patch("/:id", async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await updateSupplier(req.tenant!.businessId, paramId(req), createSchema.partial().parse(req.body))
    );
  } catch (err) {
    next(err);
  }
});

suppliersRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteSupplier(req.tenant!.businessId, paramId(req));
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

suppliersRouter.post("/:id/payments", async (req, res, next) => {
  try {
    sendSuccess(
      res,
      await recordSupplierPayment(req.tenant!.businessId, paramId(req), paymentSchema.parse(req.body))
    );
  } catch (err) {
    next(err);
  }
});

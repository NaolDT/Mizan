import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  recordCustomerPayment,
  updateCustomer,
} from "./customers.service.js";
import { redeemLoyalty } from "./loyalty.service.js";

export const customersRouter = Router();

customersRouter.use(requireAuth, requireTenant);

const createSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(24).optional().nullable(),
  notes: z.string().max(280).optional().nullable(),
});

const updateSchema = createSchema.partial();

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().min(4).max(80),
});

customersRouter.get("/", async (req, res, next) => {
  try {
    sendSuccess(res, await listCustomers(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    sendSuccess(res, await getCustomer(req.tenant!.businessId, req.params.id));
  } catch (err) {
    next(err);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    sendSuccess(res, await createCustomer(req.tenant!.businessId, body), 201);
  } catch (err) {
    next(err);
  }
});

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    sendSuccess(res, await updateCustomer(req.tenant!.businessId, req.params.id, body));
  } catch (err) {
    next(err);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteCustomer(req.tenant!.businessId, req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

customersRouter.post("/:id/payments", async (req, res, next) => {
  try {
    const body = paymentSchema.parse(req.body);
    sendSuccess(res, await recordCustomerPayment(req.tenant!.businessId, req.params.id, body));
  } catch (err) {
    next(err);
  }
});

const redeemSchema = z.object({
  points: z.number().int().positive(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().min(4).max(80),
});

customersRouter.post("/:id/loyalty/redeem", async (req, res, next) => {
  try {
    const body = redeemSchema.parse(req.body);
    await redeemLoyalty(req.tenant!.businessId, req.params.id, body);
    sendSuccess(res, await getCustomer(req.tenant!.businessId, req.params.id));
  } catch (err) {
    next(err);
  }
});

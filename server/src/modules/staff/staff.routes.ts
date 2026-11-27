import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { listAuditEvents } from "./audit.service.js";
import { createStaff, listStaff, updateStaff } from "./staff.service.js";

export const staffRouter = Router();

staffRouter.use(requireAuth, requireTenant);

const createSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(24).optional().nullable(),
  email: z.string().email().max(160).optional().nullable().or(z.literal("")),
  password: z.string().min(6).max(100),
  role: z.enum(["MANAGER", "CASHIER", "INVENTORY", "ACCOUNTANT"]),
  preferredLanguage: z.enum(["am", "om", "en"]).optional(),
});

const updateSchema = z.object({
  role: z.enum(["MANAGER", "CASHIER", "INVENTORY", "ACCOUNTANT"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

staffRouter.get("/", requirePermission("manage_staff", "view_audit"), async (req, res, next) => {
  try {
    sendSuccess(res, await listStaff(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

staffRouter.post("/", requirePermission("manage_staff"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    sendSuccess(
      res,
      await createStaff(req.tenant!.businessId, req.tenant!.userId, {
        ...body,
        email: body.email || null,
      }),
      201
    );
  } catch (err) {
    next(err);
  }
});

staffRouter.patch("/:id", requirePermission("manage_staff"), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    sendSuccess(res, await updateStaff(req.tenant!.businessId, req.tenant!.userId, String(req.params.id), body));
  } catch (err) {
    next(err);
  }
});

staffRouter.get("/audit", requirePermission("view_audit", "manage_staff"), async (req, res, next) => {
  try {
    sendSuccess(res, await listAuditEvents(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

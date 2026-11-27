import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { assertShopPermission, requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  createTransaction,
  exportTransactionsCsv,
  listTransactions,
  updateTransaction,
  voidTransaction,
} from "./transaction.service.js";

export const transactionRouter = Router();

transactionRouter.use(requireAuth, requireTenant);

const categoryEnum = z.enum([
  "SALES",
  "SERVICE_INCOME",
  "OTHER_INCOME",
  "INVENTORY_PURCHASE",
  "TRANSPORT",
  "RENT",
  "UTILITIES",
  "SALARY",
  "FOOD",
  "MARKETING",
  "OTHER_EXPENSE",
]);

const paymentMethodEnum = z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]);

const listQuerySchema = z.object({
  range: z.enum(["today", "week", "month", "all"]).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: categoryEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  includeVoided: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
  q: z.string().max(80).optional(),
});

const createTxSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: categoryEnum,
  amount: z.coerce.number().positive().max(100_000_000),
  description: z.string().min(1).max(280),
  paymentMethod: paymentMethodEnum.optional(),
  counterpartyName: z.string().max(120).nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().positive().max(1_000_000).nullable().optional(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  transactionDate: z.string().optional(),
  source: z.enum(["VOICE", "CHAT", "MANUAL", "CAMERA"]).optional(),
  idempotencyKey: z.string().min(4).max(80),
});

const updateTxSchema = z.object({
  category: categoryEnum.optional(),
  amount: z.coerce.number().positive().max(100_000_000).optional(),
  description: z.string().min(1).max(280).optional(),
  paymentMethod: paymentMethodEnum.optional(),
  counterpartyName: z.string().max(120).nullable().optional(),
  transactionDate: z.string().optional(),
});

transactionRouter.get("/export", requirePermission("view_ledger"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const csv = await exportTransactionsCsv(req.tenant!.businessId, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="mizan-transactions.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

transactionRouter.get("/", requirePermission("view_ledger"), async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listTransactions(req.tenant!.businessId, query);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

transactionRouter.post("/", async (req, res, next) => {
  try {
    const body = createTxSchema.parse(req.body);
    assertShopPermission(
      req.tenant!.shopRole,
      body.type === "INCOME" ? "sell" : "record_expense"
    );
    const tx = await createTransaction(
      req.tenant!.businessId,
      req.tenant!.userId,
      body
    );
    sendSuccess(res, tx, 201);
  } catch (err) {
    next(err);
  }
});

transactionRouter.patch("/:id", requirePermission("edit_transaction"), async (req, res, next) => {
  try {
    const body = updateTxSchema.parse(req.body);
    const updated = await updateTransaction(
      req.tenant!.businessId,
      String(req.params.id),
      body
    );
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

transactionRouter.post("/:id/void", requirePermission("void_transaction"), async (req, res, next) => {
  try {
    const voided = await voidTransaction(
      req.tenant!.businessId,
      String(req.params.id),
      req.tenant!.userId
    );
    sendSuccess(res, voided);
  } catch (err) {
    next(err);
  }
});

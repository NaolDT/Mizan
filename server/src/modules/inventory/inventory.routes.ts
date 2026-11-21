import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getInventoryValuation,
  getProduct,
  getProductProfitability,
  listMovements,
  listProducts,
  updateProduct,
} from "./inventory.service.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireTenant);

const optionalMoney = z.number().nonnegative().nullable().optional();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().max(24).optional(),
  quantityOnHand: z.number().min(0).optional(),
  lowStockThreshold: z.number().min(0).optional(),
  sellingPrice: optionalMoney,
  costPrice: optionalMoney,
});

const updateSchema = createSchema.partial();

const adjustSchema = z.object({
  quantityDelta: z.number().refine((n) => n !== 0, "Stock change cannot be zero"),
  reason: z.enum(["RESTOCK", "SALE", "ADJUSTMENT"]),
  note: z.string().max(200).optional(),
});

inventoryRouter.get("/", async (req, res, next) => {
  try {
    sendSuccess(res, await listProducts(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get("/movements", async (req, res, next) => {
  try {
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    sendSuccess(res, await listMovements(req.tenant!.businessId, productId));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get("/profitability", async (req, res, next) => {
  try {
    const range =
      req.query.range === "today" ||
      req.query.range === "week" ||
      req.query.range === "month" ||
      req.query.range === "all"
        ? req.query.range
        : "month";
    sendSuccess(res, await getProductProfitability(req.tenant!.businessId, range));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get("/valuation", async (req, res, next) => {
  try {
    sendSuccess(res, await getInventoryValuation(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get("/:id", async (req, res, next) => {
  try {
    sendSuccess(res, await getProduct(req.tenant!.businessId, req.params.id));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    sendSuccess(res, await createProduct(req.tenant!.businessId, body), 201);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    sendSuccess(res, await updateProduct(req.tenant!.businessId, req.params.id, body));
  } catch (err) {
    next(err);
  }
});

inventoryRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteProduct(req.tenant!.businessId, req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

inventoryRouter.post("/:id/adjust", async (req, res, next) => {
  try {
    const body = adjustSchema.parse(req.body);
    sendSuccess(
      res,
      await adjustStock(req.tenant!.businessId, req.params.id, req.tenant!.userId, body)
    );
  } catch (err) {
    next(err);
  }
});

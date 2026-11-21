import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { AppError, sendSuccess } from "../../utils/apiResponse.js";
import {
  adjustStock,
  createProduct,
  deleteProduct,
  getInventoryValuation,
  getProduct,
  getProductImage,
  getProductProfitability,
  listMovements,
  listPriceHistory,
  listProducts,
  saveProductImage,
  updateProduct,
} from "./inventory.service.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireTenant);

const optionalMoney = z.number().nonnegative().nullable().optional();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).nullable().optional(),
  sizeLabel: z.string().max(40).nullable().optional(),
  categoryLabel: z.string().max(40).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  aliases: z.string().max(280).nullable().optional(),
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

function paramId(req: { params: { id?: string | string[] } }): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value ?? "";
}

inventoryRouter.get("/:id/price-history", async (req, res, next) => {
  try {
    sendSuccess(res, await listPriceHistory(req.tenant!.businessId, paramId(req)));
  } catch (err) {
    next(err);
  }
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 400 * 1024 },
});
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

inventoryRouter.post("/:id/image", imageUpload.single("image"), async (req, res, next) => {
  try {
    if (!req.file?.buffer.length) {
      throw new AppError(400, "IMAGE_REQUIRED", "Choose a product photo");
    }
    const mime = (req.file.mimetype || "image/jpeg").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mime)) {
      throw new AppError(400, "UNSUPPORTED_IMAGE", "Use a JPEG, PNG or WebP photo");
    }
    sendSuccess(
      res,
      await saveProductImage(
        req.tenant!.businessId,
        paramId(req),
        req.file.buffer,
        mime === "image/jpg" ? "image/jpeg" : mime
      )
    );
  } catch (err) {
    next(err);
  }
});

inventoryRouter.get("/:id/image", async (req, res, next) => {
  try {
    const image = await getProductImage(req.tenant!.businessId, req.params.id);
    if (!image) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", image.mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(image.bytes);
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
    sendSuccess(res, await createProduct(req.tenant!.businessId, body, req.tenant!.userId), 201);
  } catch (err) {
    next(err);
  }
});

inventoryRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    sendSuccess(
      res,
      await updateProduct(req.tenant!.businessId, req.params.id, body, req.tenant!.userId)
    );
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

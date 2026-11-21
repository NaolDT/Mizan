import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { AppError, sendSuccess } from "../../utils/apiResponse.js";
import { reserveAndRun } from "../billing/credit.service.js";
import { saveProductImage } from "../inventory/inventory.service.js";
import {
  analyzeBusinessImage,
  confirmVisionPurchase,
  confirmVisionSale,
  registerVisionProduct,
} from "./vision.service.js";

export const visionRouter = Router();

visionRouter.use(requireAuth, requireTenant);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const workflowEnum = z.enum([
  "QUICK_SALE",
  "ADD_INVENTORY",
  "SCAN_RECEIPT",
  "IDENTIFY",
  "GENERAL",
]);

const analyzeFields = z.object({
  workflow: workflowEnum.default("GENERAL"),
  language: z.enum(["am", "om", "en"]).default("am"),
  barcode: z.string().max(64).optional(),
});

const saleSchema = z.object({
  idempotencyKey: z.string().min(4).max(80),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  customerName: z.string().max(120).nullable().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid().nullable().optional(),
        quantity: z.number().positive().max(1_000_000),
        unitPriceOverride: z.number().positive().max(100_000_000).nullable().optional(),
        unmatchedAmount: z.number().positive().max(100_000_000).nullable().optional(),
        description: z.string().min(1).max(280),
        detectedName: z.string().max(160).nullable().optional(),
        barcode: z.string().max(64).nullable().optional(),
      })
    )
    .min(1)
    .max(30),
});

const purchaseSchema = z.object({
  idempotencyKey: z.string().min(4).max(80),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
  supplierName: z.string().max(120).nullable().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid().nullable().optional(),
        quantity: z.number().positive().max(1_000_000),
        unitCost: z.number().positive().max(100_000_000),
        description: z.string().min(1).max(280),
        detectedName: z.string().max(160).nullable().optional(),
      })
    )
    .min(1)
    .max(30),
});

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(80).nullable().optional(),
  sizeLabel: z.string().max(40).nullable().optional(),
  categoryLabel: z.string().max(40).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  unit: z.string().max(24).optional(),
  sellingPrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  quantityOnHand: z.number().min(0).optional(),
  detectedName: z.string().max(160).nullable().optional(),
});

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

visionRouter.post("/analyze", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file?.buffer.length) {
      throw new AppError(400, "IMAGE_REQUIRED", "Capture a photo first");
    }
    const mime = (req.file.mimetype || "image/jpeg").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(mime)) {
      throw new AppError(400, "UNSUPPORTED_IMAGE", "Use a JPEG, PNG or WebP photo");
    }
    const fields = analyzeFields.parse(req.body);
    const result = await reserveAndRun({
      businessId: req.tenant!.businessId,
      userId: req.tenant!.userId,
      feature: fields.workflow === "SCAN_RECEIPT" ? "RECEIPT" : "VISION",
      provider: "gemini",
      run: () =>
        analyzeBusinessImage({
          businessId: req.tenant!.businessId,
          imageBuffer: req.file!.buffer,
          mimeType: mime === "image/jpg" ? "image/jpeg" : mime,
          workflow: fields.workflow,
          language: fields.language,
          clientBarcode: fields.barcode,
        }),
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

visionRouter.post("/confirm-sale", async (req, res, next) => {
  try {
    const body = saleSchema.parse(req.body);
    sendSuccess(
      res,
      await confirmVisionSale(req.tenant!.businessId, req.tenant!.userId, body)
    );
  } catch (err) {
    next(err);
  }
});

visionRouter.post("/confirm-purchase", async (req, res, next) => {
  try {
    const body = purchaseSchema.parse(req.body);
    sendSuccess(
      res,
      await confirmVisionPurchase(req.tenant!.businessId, req.tenant!.userId, body)
    );
  } catch (err) {
    next(err);
  }
});

visionRouter.post("/register-product", upload.single("image"), async (req, res, next) => {
  try {
    const rawBody =
      typeof req.body.payload === "string" ? JSON.parse(req.body.payload) : req.body;
    const body = registerSchema.parse(rawBody);
    const product = await registerVisionProduct(req.tenant!.businessId, req.tenant!.userId, body);
    if (req.file?.buffer.length) {
      await saveProductImage(
        req.tenant!.businessId,
        product.id,
        req.file.buffer,
        req.file.mimetype || "image/jpeg"
      );
    }
    sendSuccess(res, product, 201);
  } catch (err) {
    next(err);
  }
});

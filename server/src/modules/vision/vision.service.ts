import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import type {
  LanguageCode,
  ProductDto,
  VisionAnalyzeResponse,
  VisionConfirmPurchaseRequest,
  VisionConfirmResult,
  VisionConfirmSaleRequest,
  VisionDetectedItem,
  VisionWorkflow,
} from "@mizan/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/apiResponse.js";
import { createProduct } from "../inventory/inventory.service.js";
import { createTransaction } from "../transactions/transaction.service.js";
import { matchDetectedProduct, rememberMatch } from "./productMatch.js";
import { prisma } from "../../config/prisma.js";

const visionItemSchema = z.object({
  name: z.string().min(1).max(160),
  brand: z.string().max(80).nullish(),
  sizeLabel: z.string().max(40).nullish(),
  barcode: z.string().max(64).nullish(),
  quantityGuess: z.coerce.number().min(0).max(10_000).optional().default(1),
  ocrText: z.string().max(400).nullish(),
});

const visionLlmSchema = z.object({
  intentGuess: z
    .enum(["QUICK_SALE", "ADD_INVENTORY", "SCAN_RECEIPT", "IDENTIFY", "GENERAL"])
    .optional()
    .default("GENERAL"),
  items: z.array(visionItemSchema).max(20).default([]),
  receipt: z
    .object({
      supplier: z.string().max(120).nullish(),
      date: z.string().max(20).nullish(),
      total: z.coerce.number().nullish(),
    })
    .nullish(),
  note: z.string().max(280).nullish(),
});

const VISION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intentGuess: {
      type: Type.STRING,
      enum: ["QUICK_SALE", "ADD_INVENTORY", "SCAN_RECEIPT", "IDENTIFY", "GENERAL"],
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          brand: { type: Type.STRING, nullable: true },
          sizeLabel: { type: Type.STRING, nullable: true },
          barcode: { type: Type.STRING, nullable: true },
          quantityGuess: { type: Type.NUMBER },
          ocrText: { type: Type.STRING, nullable: true },
        },
        required: ["name"],
      },
    },
    receipt: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        supplier: { type: Type.STRING, nullable: true },
        date: { type: Type.STRING, nullable: true },
        total: { type: Type.NUMBER, nullable: true },
      },
    },
    note: { type: Type.STRING, nullable: true },
  },
  required: ["intentGuess", "items"],
};

function toNumber2(value: { toFixed: (n: number) => string } | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toFixed(2));
}

async function attachMatch(
  businessId: string,
  detected: z.infer<typeof visionItemSchema>
): Promise<VisionDetectedItem> {
  const match = await matchDetectedProduct(businessId, {
    name: detected.name,
    brand: detected.brand,
    size: detected.sizeLabel,
    barcode: detected.barcode,
  });
  const qty = Number.isFinite(detected.quantityGuess) && detected.quantityGuess > 0
    ? Number(detected.quantityGuess)
    : 1;
  return {
    detectedName: detected.name,
    brand: detected.brand ?? null,
    sizeLabel: detected.sizeLabel ?? null,
    barcode: detected.barcode ?? null,
    quantityGuess: qty,
    ocrText: detected.ocrText ?? null,
    match: {
      productId: match?.product.id ?? null,
      productName: match?.product.name ?? null,
      confidence: match?.confidence ?? "none",
      score: match?.score ?? 0,
      sellingPrice: toNumber2(match?.product.sellingPrice),
      costPrice: toNumber2(match?.product.costPrice),
      quantityOnHand: match ? Number(match.product.quantityOnHand.toFixed(2)) : null,
      unit: match?.product.unit ?? null,
      alternatives: (match?.alternatives ?? []).map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        score: Number(row.score.toFixed(2)),
      })),
    },
  };
}

async function runGeminiVision(params: {
  imageBase64: string;
  mimeType: string;
  workflow: VisionWorkflow;
  language: LanguageCode;
  catalogSummary: string;
}): Promise<z.infer<typeof visionLlmSchema> | null> {
  if (!env.GEMINI_API_KEY) return null;

  const languageDirective =
    params.language === "am"
      ? "Use Amharic product names when labels are in Amharic."
      : params.language === "om"
        ? "Use Afaan Oromo names when labels are in Afaan Oromo."
        : "Use the label language; prefer English names when mixed.";

  const system = `You are Mizan Vision for an Ethiopian shop. Identify products, barcodes, and receipt lines from the photo.
${languageDirective}
Rules:
- Return structured JSON only.
- NEVER invent selling prices or ETB amounts that are not printed on a receipt.
- quantityGuess is a visual estimate and may be 1 if unclear.
- Match names to CATALOG_JSON ids only as a hint in the name field; do not output prices.
- If this is a receipt, fill receipt.supplier/date/total from printed text only.
- If the image is not business-related, return items: [].

CATALOG_JSON (this shop only):
${params.catalogSummary}

Requested workflow: ${params.workflow}`;

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const models = [...new Set([env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL, "gemini-2.5-flash"])];

  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              { text: system },
              { inlineData: { mimeType: params.mimeType, data: params.imageBase64 } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: VISION_SCHEMA,
          temperature: 0.1,
        },
      });
      const raw = response.text?.trim();
      if (!raw) continue;
      const parsed = visionLlmSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch (err) {
      console.warn("[Vision] model failed", modelName, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export async function analyzeBusinessImage(params: {
  businessId: string;
  imageBuffer: Buffer;
  mimeType: string;
  workflow: VisionWorkflow;
  language: LanguageCode;
  clientBarcode?: string | null;
}): Promise<VisionAnalyzeResponse> {
  const products = await prisma.product.findMany({
    where: { businessId: params.businessId },
    select: {
      id: true,
      name: true,
      brand: true,
      sizeLabel: true,
      barcode: true,
      unit: true,
    },
    take: 80,
  });

  const catalogSummary = JSON.stringify(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: p.sizeLabel,
      barcode: p.barcode,
      unit: p.unit,
    }))
  );

  const llm = await runGeminiVision({
    imageBase64: params.imageBuffer.toString("base64"),
    mimeType: params.mimeType,
    workflow: params.workflow,
    language: params.language,
    catalogSummary,
  });

  const seedItems = llm?.items ?? [];
  if (params.clientBarcode && !seedItems.some((item) => item.barcode === params.clientBarcode)) {
    seedItems.unshift({
      name: params.clientBarcode,
      barcode: params.clientBarcode,
      quantityGuess: 1,
    });
  }

  const items = await Promise.all(seedItems.map((item) => attachMatch(params.businessId, item)));

  return {
    workflow: params.workflow,
    intentGuess: llm?.intentGuess ?? params.workflow,
    items,
    receipt: llm?.receipt
      ? {
          supplier: llm.receipt.supplier ?? null,
          date: llm.receipt.date ?? null,
          total: llm.receipt.total ?? null,
        }
      : null,
    catalogSize: products.length,
    provider: llm ? "gemini-vision" : "catalog-only",
    note: llm
      ? llm.note ?? null
      : env.GEMINI_API_KEY
        ? "Vision model unavailable. Match from barcode or pick products by hand."
        : "GEMINI_API_KEY is not set. Use barcode or pick products from your catalog.",
  };
}

export async function confirmVisionSale(
  businessId: string,
  userId: string,
  input: VisionConfirmSaleRequest
): Promise<VisionConfirmResult> {
  if (!input.lines.length) {
    throw new AppError(400, "EMPTY_SALE", "Add at least one item before confirming");
  }

  type PreparedLine = {
    amount: number;
    productId: string | null;
    quantity: number | null;
    description: string;
    detectedName?: string | null;
    barcode?: string | null;
  };

  const prepared: PreparedLine[] = [];
  const neededQty = new Map<string, number>();

  for (const line of input.lines) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError(400, "INVALID_QUANTITY", "Each line needs a positive quantity");
    }

    let amount: number;
    let productId: string | null = line.productId ?? null;
    let description = line.description.trim();

    if (productId) {
      const product = await prisma.product.findFirst({
        where: { id: productId, businessId },
      });
      if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "A sale line refers to a missing product");
      const unitPrice =
        line.unitPriceOverride != null && line.unitPriceOverride > 0
          ? line.unitPriceOverride
          : toNumber2(product.sellingPrice);
      if (unitPrice == null || unitPrice <= 0) {
        throw new AppError(
          400,
          "PRICE_REQUIRED",
          `Set a selling price for ${product.name} before recording the sale`
        );
      }
      amount = Number((unitPrice * qty).toFixed(2));
      description = description || `${product.name} × ${qty}`;
      neededQty.set(productId, (neededQty.get(productId) ?? 0) + qty);
    } else {
      amount = Number(line.unmatchedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(400, "AMOUNT_REQUIRED", "Enter an amount for items not in inventory");
      }
      productId = null;
    }

    prepared.push({
      amount,
      productId,
      quantity: productId ? qty : null,
      description: description.slice(0, 280),
      detectedName: line.detectedName,
      barcode: line.barcode,
    });
  }

  for (const [productId, qty] of neededQty) {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      select: { name: true, quantityOnHand: true },
    });
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "A sale line refers to a missing product");
    if (product.quantityOnHand.lt(qty)) {
      throw new AppError(409, "INSUFFICIENT_STOCK", `Not enough ${product.name} in stock`);
    }
  }

  const transactions = [];
  let totalAmount = 0;

  for (const [index, line] of prepared.entries()) {
    const tx = await createTransaction(businessId, userId, {
      type: "INCOME",
      category: "SALES",
      amount: line.amount,
      description: line.description,
      paymentMethod: input.paymentMethod ?? "CASH",
      counterpartyName: input.customerName ?? null,
      productId: line.productId,
      quantity: line.quantity,
      source: "CAMERA",
      idempotencyKey: `${input.idempotencyKey}:sale:${index}`,
    });
    transactions.push(tx);
    totalAmount += line.amount;
    if (line.productId && line.detectedName) {
      await rememberMatch(businessId, line.productId, line.detectedName, line.barcode);
    }
  }

  return { transactions, totalAmount: Number(totalAmount.toFixed(2)) };
}

export async function confirmVisionPurchase(
  businessId: string,
  userId: string,
  input: VisionConfirmPurchaseRequest
): Promise<VisionConfirmResult> {
  if (!input.lines.length) {
    throw new AppError(400, "EMPTY_PURCHASE", "Add at least one purchased item");
  }

  const transactions = [];
  let totalAmount = 0;

  for (const [index, line] of input.lines.entries()) {
    const qty = Number(line.quantity);
    const unitCost = Number(line.unitCost);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCost) || unitCost <= 0) {
      throw new AppError(400, "INVALID_LINE", "Each purchase line needs quantity and cost");
    }
    const amount = Number((unitCost * qty).toFixed(2));
    const tx = await createTransaction(businessId, userId, {
      type: "EXPENSE",
      category: "INVENTORY_PURCHASE",
      amount,
      description: (line.description || "Camera purchase").slice(0, 280),
      paymentMethod: input.paymentMethod ?? "CASH",
      counterpartyName: input.supplierName ?? null,
      productId: line.productId ?? null,
      quantity: line.productId ? qty : null,
      source: "CAMERA",
      idempotencyKey: `${input.idempotencyKey}:buy:${index}`,
    });
    transactions.push(tx);
    totalAmount += amount;
    if (line.productId && line.detectedName) {
      await rememberMatch(businessId, line.productId, line.detectedName);
    }
  }

  return { transactions, totalAmount: Number(totalAmount.toFixed(2)) };
}

export async function registerVisionProduct(
  businessId: string,
  userId: string,
  input: {
    name: string;
    brand?: string | null;
    sizeLabel?: string | null;
    categoryLabel?: string | null;
    barcode?: string | null;
    unit?: string;
    sellingPrice?: number | null;
    costPrice?: number | null;
    quantityOnHand?: number;
    detectedName?: string | null;
  }
): Promise<ProductDto> {
  const product = await createProduct(
    businessId,
    {
      name: input.name,
      brand: input.brand,
      sizeLabel: input.sizeLabel,
      categoryLabel: input.categoryLabel,
      barcode: input.barcode,
      unit: input.unit,
      sellingPrice: input.sellingPrice,
      costPrice: input.costPrice,
      quantityOnHand: input.quantityOnHand ?? 0,
    },
    userId
  );
  if (input.detectedName) {
    await rememberMatch(businessId, product.id, input.detectedName, input.barcode);
  }
  return product;
}

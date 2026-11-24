import { Prisma, type Product } from "@prisma/client";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  DateRangePreset,
  InventoryValuationDto,
  ProductDto,
  ProductPriceHistoryDto,
  ProductProfitabilityDto,
  StockMovementDto,
  StockMovementReason,
  UpdateProductRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { countEatPeriodDays, getEatDateWindow } from "../../utils/eatDate.js";
import { computeDaysOfCover } from "../analytics/stockCover.js";
import { toNameKey } from "../customers/customers.service.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

function mapProductDto(product: Product): ProductDto {
  const qty = toNumber2(product.quantityOnHand);
  const threshold = toNumber2(product.lowStockThreshold);
  return {
    id: product.id,
    businessId: product.businessId,
    name: product.name,
    brand: product.brand,
    sizeLabel: product.sizeLabel,
    categoryLabel: product.categoryLabel,
    barcode: product.barcode,
    unit: product.unit,
    quantityOnHand: qty,
    lowStockThreshold: threshold,
    maxStockLevel: toNumber2(product.maxStockLevel),
    sellingPrice: product.sellingPrice != null ? toNumber2(product.sellingPrice) : null,
    costPrice: product.costPrice != null ? toNumber2(product.costPrice) : null,
    hasImage: Boolean(product.imageBytes && product.imageBytes.length > 0),
    isLowStock: threshold > 0 && qty <= threshold,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function listProducts(businessId: string): Promise<ProductDto[]> {
  const rows = await prisma.product.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
  return rows.map(mapProductDto);
}

export async function getProduct(businessId: string, productId: string): Promise<ProductDto> {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
  return mapProductDto(product);
}

function optionalText(value: string | null | undefined, max = 80): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, max) : null;
}

async function recordPriceHistory(params: {
  businessId: string;
  productId: string;
  recordedById?: string;
  sellingPrice: Prisma.Decimal | null;
  costPrice: Prisma.Decimal | null;
  previousSelling: Prisma.Decimal | null;
  previousCost: Prisma.Decimal | null;
}): Promise<void> {
  if (!params.recordedById) return;
  const sellingChanged =
    String(params.sellingPrice ?? "") !== String(params.previousSelling ?? "");
  const costChanged = String(params.costPrice ?? "") !== String(params.previousCost ?? "");
  if (!sellingChanged && !costChanged) return;
  await prisma.productPriceHistory.create({
    data: {
      businessId: params.businessId,
      productId: params.productId,
      recordedById: params.recordedById,
      sellingPrice: params.sellingPrice,
      costPrice: params.costPrice,
      previousSelling: params.previousSelling,
      previousCost: params.previousCost,
    },
  });
}

export async function createProduct(
  businessId: string,
  input: CreateProductRequest,
  recordedById?: string
): Promise<ProductDto> {
  const { assertCapacity } = await import("../billing/credit.service.js");
  await assertCapacity(businessId, "products");

  const name = input.name.trim();
  if (name.length < 1) throw new AppError(400, "INVALID_NAME", "Product name is required");

  const qty = new Prisma.Decimal((input.quantityOnHand ?? 0).toFixed(2));
  if (qty.lt(0)) throw new AppError(400, "INVALID_QUANTITY", "Starting quantity cannot be negative");

  const sellingPrice =
    input.sellingPrice != null ? new Prisma.Decimal(input.sellingPrice.toFixed(2)) : null;
  const costPrice =
    input.costPrice != null ? new Prisma.Decimal(input.costPrice.toFixed(2)) : null;

  try {
    const created = await prisma.product.create({
      data: {
        businessId,
        name,
        nameKey: toNameKey(name),
        brand: optionalText(input.brand),
        sizeLabel: optionalText(input.sizeLabel, 40),
        categoryLabel: optionalText(input.categoryLabel, 40),
        barcode: optionalText(input.barcode, 64),
        aliases: optionalText(input.aliases, 280),
        unit: input.unit?.trim() || "pcs",
        quantityOnHand: qty,
        lowStockThreshold: new Prisma.Decimal((input.lowStockThreshold ?? 0).toFixed(2)),
        maxStockLevel: new Prisma.Decimal((input.maxStockLevel ?? 0).toFixed(2)),
        sellingPrice,
        costPrice,
      },
    });
    await recordPriceHistory({
      businessId,
      productId: created.id,
      recordedById,
      sellingPrice,
      costPrice,
      previousSelling: null,
      previousCost: null,
    });
    return mapProductDto(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "PRODUCT_EXISTS", "A product with this name already exists");
    }
    throw err;
  }
}

export async function updateProduct(
  businessId: string,
  productId: string,
  input: UpdateProductRequest,
  recordedById?: string
): Promise<ProductDto> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");

  const name = input.name?.trim();
  const nextSelling =
    input.sellingPrice === undefined
      ? existing.sellingPrice
      : input.sellingPrice == null
        ? null
        : new Prisma.Decimal(input.sellingPrice.toFixed(2));
  const nextCost =
    input.costPrice === undefined
      ? existing.costPrice
      : input.costPrice == null
        ? null
        : new Prisma.Decimal(input.costPrice.toFixed(2));

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name, nameKey: toNameKey(name) } : {}),
      ...(input.brand !== undefined ? { brand: optionalText(input.brand) } : {}),
      ...(input.sizeLabel !== undefined ? { sizeLabel: optionalText(input.sizeLabel, 40) } : {}),
      ...(input.categoryLabel !== undefined
        ? { categoryLabel: optionalText(input.categoryLabel, 40) }
        : {}),
      ...(input.barcode !== undefined ? { barcode: optionalText(input.barcode, 64) } : {}),
      ...(input.aliases !== undefined ? { aliases: optionalText(input.aliases, 280) } : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() || "pcs" } : {}),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: new Prisma.Decimal(input.lowStockThreshold.toFixed(2)) }
        : {}),
      ...(input.maxStockLevel !== undefined
        ? { maxStockLevel: new Prisma.Decimal(input.maxStockLevel.toFixed(2)) }
        : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: nextSelling } : {}),
      ...(input.costPrice !== undefined ? { costPrice: nextCost } : {}),
    },
  });
  await recordPriceHistory({
    businessId,
    productId: existing.id,
    recordedById,
    sellingPrice: nextSelling,
    costPrice: nextCost,
    previousSelling: existing.sellingPrice,
    previousCost: existing.costPrice,
  });
  return mapProductDto(updated);
}

export async function saveProductImage(
  businessId: string,
  productId: string,
  bytes: Buffer,
  mime: string
): Promise<ProductDto> {
  if (bytes.length > 400_000) {
    throw new AppError(400, "IMAGE_TOO_LARGE", "Product photo must be a small thumbnail");
  }
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: { imageBytes: Uint8Array.from(bytes), imageMime: mime.slice(0, 40) },
  });
  return mapProductDto(updated);
}

export async function listPriceHistory(
  businessId: string,
  productId: string
): Promise<ProductPriceHistoryDto[]> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
  const rows = await prisma.productPriceHistory.findMany({
    where: { businessId, productId },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    sellingPrice: row.sellingPrice != null ? toNumber2(row.sellingPrice) : null,
    costPrice: row.costPrice != null ? toNumber2(row.costPrice) : null,
    previousSelling: row.previousSelling != null ? toNumber2(row.previousSelling) : null,
    previousCost: row.previousCost != null ? toNumber2(row.previousCost) : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getProductImage(
  businessId: string,
  productId: string
): Promise<{ mime: string; bytes: Buffer } | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { imageBytes: true, imageMime: true },
  });
  if (!product?.imageBytes || !product.imageMime) return null;
  return { mime: product.imageMime, bytes: Buffer.from(product.imageBytes) };
}

export async function findProductByName(
  businessId: string,
  rawName: string
): Promise<Product | null> {
  const nameKey = toNameKey(rawName);
  if (!nameKey) return null;
  return prisma.product.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
  });
}

export async function findOrCreateProductByName(
  businessId: string,
  rawName: string,
  unit = "pcs"
): Promise<Product> {
  const existing = await findProductByName(businessId, rawName);
  if (existing) return existing;
  const name = rawName.trim();
  try {
    return await prisma.product.create({
      data: { businessId, name, nameKey: toNameKey(name), unit },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.product.findUniqueOrThrow({
        where: { businessId_nameKey: { businessId, nameKey: toNameKey(name) } },
      });
    }
    throw err;
  }
}

/**
 * Applies a stock change in one database transaction so two parallel sales
 * cannot push quantity below zero.
 */
export async function adjustStock(
  businessId: string,
  productId: string,
  recordedById: string,
  input: AdjustStockRequest,
  transactionId?: string
): Promise<ProductDto> {
  if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
    throw new AppError(400, "INVALID_QUANTITY", "Stock change cannot be zero");
  }

  const delta = new Prisma.Decimal(input.quantityDelta.toFixed(2));

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      });
      if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");

      const nextQty = product.quantityOnHand.plus(delta);
      if (nextQty.lt(0)) {
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `Not enough ${product.name} in stock (${toNumber2(product.quantityOnHand)} ${product.unit})`
        );
      }

      const updated = await tx.product.update({
        where: { id: product.id },
        data: { quantityOnHand: nextQty },
      });

      await tx.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          recordedById,
          quantityDelta: delta,
          quantityAfter: nextQty,
          reason: input.reason,
          note: input.note?.trim() || null,
          transactionId: transactionId ?? null,
        },
      });

      return mapProductDto(updated);
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw err;
  }
}

export async function listMovements(
  businessId: string,
  productId?: string
): Promise<StockMovementDto[]> {
  const rows = await prisma.stockMovement.findMany({
    where: { businessId, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    quantityDelta: toNumber2(row.quantityDelta),
    quantityAfter: toNumber2(row.quantityAfter),
    reason: row.reason,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function countLowStock(businessId: string): Promise<number> {
  const products = await prisma.product.findMany({
    where: { businessId, lowStockThreshold: { gt: 0 } },
    select: { quantityOnHand: true, lowStockThreshold: true },
  });
  return products.filter((p) => p.quantityOnHand.lte(p.lowStockThreshold)).length;
}

export async function listLowStock(businessId: string): Promise<ProductDto[]> {
  const products = await prisma.product.findMany({
    where: { businessId, lowStockThreshold: { gt: 0 } },
    orderBy: { name: "asc" },
  });
  return products.map(mapProductDto).filter((p) => p.isLowStock);
}

export async function reverseStockForTransaction(
  businessId: string,
  transactionId: string,
  recordedById: string
): Promise<void> {
  const original = await prisma.stockMovement.findFirst({
    where: { businessId, transactionId },
  });
  if (!original) return;

  const alreadyReversed = await prisma.stockMovement.findFirst({
    where: {
      businessId,
      transactionId,
      reason: "ADJUSTMENT",
      note: "Voided transaction",
    },
  });
  if (alreadyReversed) return;

  await adjustStock(
    businessId,
    original.productId,
    recordedById,
    {
      quantityDelta: -toNumber2(original.quantityDelta),
      reason: "ADJUSTMENT",
      note: "Voided transaction",
    },
    transactionId
  );
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
  await prisma.product.delete({ where: { id: existing.id } });
}

export async function getProductProfitability(
  businessId: string,
  range: DateRangePreset = "month"
): Promise<ProductProfitabilityDto[]> {
  let dateFilter: Prisma.DateTimeFilter | undefined;
  if (range === "today" || range === "week" || range === "month") {
    const window = getEatDateWindow(range);
    dateFilter = { gte: window.startUtc, lte: window.endUtc };
  }

  const periodDays =
    range === "today" || range === "week" || range === "month" ? countEatPeriodDays(range) : 30;

  const [products, sales] = await Promise.all([
    prisma.product.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        type: "INCOME",
        productId: { not: null },
        ...(dateFilter ? { transactionDate: dateFilter } : {}),
      },
      select: { productId: true, amount: true, quantity: true },
    }),
  ]);

  const totals = new Map<string, { revenue: Prisma.Decimal; qty: Prisma.Decimal; count: number }>();
  for (const row of sales) {
    if (!row.productId) continue;
    const current = totals.get(row.productId) ?? {
      revenue: new Prisma.Decimal(0),
      qty: new Prisma.Decimal(0),
      count: 0,
    };
    current.revenue = current.revenue.plus(row.amount);
    if (row.quantity) current.qty = current.qty.plus(row.quantity);
    current.count += 1;
    totals.set(row.productId, current);
  }

  return products
    .map((product) => {
      const agg = totals.get(product.id);
      const revenue = agg?.revenue ?? new Prisma.Decimal(0);
      const quantitySold = agg?.qty ?? new Prisma.Decimal(0);
      const cogs =
        product.costPrice != null && quantitySold.gt(0)
          ? product.costPrice.mul(quantitySold)
          : null;
      const grossProfit = cogs != null ? revenue.minus(cogs) : null;
      const stockCostValue =
        product.costPrice != null ? product.costPrice.mul(product.quantityOnHand) : null;
      const cover = computeDaysOfCover({
        quantityOnHand: product.quantityOnHand,
        quantitySold,
        salesCount: agg?.count ?? 0,
        periodDays,
      });
      return {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        quantityOnHand: toNumber2(product.quantityOnHand),
        salesCount: agg?.count ?? 0,
        quantitySold: toNumber2(quantitySold),
        revenue: toNumber2(revenue),
        cogs: cogs != null ? toNumber2(cogs) : null,
        grossProfit: grossProfit != null ? toNumber2(grossProfit) : null,
        stockCostValue: stockCostValue != null ? toNumber2(stockCostValue) : null,
        dailySalesRate: cover.dailySalesRate,
        daysOfCover: cover.daysOfCover,
        coverConfidence: cover.coverConfidence,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getInventoryValuation(businessId: string): Promise<InventoryValuationDto> {
  const products = await prisma.product.findMany({ where: { businessId } });
  let costValue = new Prisma.Decimal(0);
  let retailValue = new Prisma.Decimal(0);
  for (const product of products) {
    if (product.costPrice != null) {
      costValue = costValue.plus(product.costPrice.mul(product.quantityOnHand));
    }
    if (product.sellingPrice != null) {
      retailValue = retailValue.plus(product.sellingPrice.mul(product.quantityOnHand));
    }
  }
  return {
    productCount: products.length,
    costValue: toNumber2(costValue),
    retailValue: toNumber2(retailValue),
  };
}

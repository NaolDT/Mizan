import { Prisma, type Product } from "@prisma/client";
import type {
  AdjustStockRequest,
  CreateProductRequest,
  ProductDto,
  StockMovementDto,
  StockMovementReason,
  UpdateProductRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
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
    unit: product.unit,
    quantityOnHand: qty,
    lowStockThreshold: threshold,
    sellingPrice: product.sellingPrice ? toNumber2(product.sellingPrice) : null,
    costPrice: product.costPrice ? toNumber2(product.costPrice) : null,
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

export async function createProduct(
  businessId: string,
  input: CreateProductRequest
): Promise<ProductDto> {
  const name = input.name.trim();
  if (name.length < 1) throw new AppError(400, "INVALID_NAME", "Product name is required");

  const qty = new Prisma.Decimal((input.quantityOnHand ?? 0).toFixed(2));
  if (qty.lt(0)) throw new AppError(400, "INVALID_QUANTITY", "Starting quantity cannot be negative");

  try {
    const created = await prisma.product.create({
      data: {
        businessId,
        name,
        nameKey: toNameKey(name),
        unit: input.unit?.trim() || "pcs",
        quantityOnHand: qty,
        lowStockThreshold: new Prisma.Decimal((input.lowStockThreshold ?? 0).toFixed(2)),
        sellingPrice:
          input.sellingPrice != null ? new Prisma.Decimal(input.sellingPrice.toFixed(2)) : null,
        costPrice: input.costPrice != null ? new Prisma.Decimal(input.costPrice.toFixed(2)) : null,
      },
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
  input: UpdateProductRequest
): Promise<ProductDto> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");

  const name = input.name?.trim();
  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name, nameKey: toNameKey(name) } : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() || "pcs" } : {}),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: new Prisma.Decimal(input.lowStockThreshold.toFixed(2)) }
        : {}),
      ...(input.sellingPrice !== undefined
        ? {
            sellingPrice:
              input.sellingPrice == null
                ? null
                : new Prisma.Decimal(input.sellingPrice.toFixed(2)),
          }
        : {}),
      ...(input.costPrice !== undefined
        ? {
            costPrice:
              input.costPrice == null ? null : new Prisma.Decimal(input.costPrice.toFixed(2)),
          }
        : {}),
    },
  });
  return mapProductDto(updated);
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

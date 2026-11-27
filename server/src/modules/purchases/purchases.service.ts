import { Prisma, type PurchaseOrder, type PurchaseOrderItem, type Supplier } from "@prisma/client";
import type {
  CreatePurchaseOrderRequest,
  PaymentMethod,
  PurchaseOrderDetailDto,
  PurchaseOrderDto,
  ReceivePurchaseRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { createTransaction } from "../transactions/transaction.service.js";
import { updateProduct } from "../inventory/inventory.service.js";
import {
  nextPurchaseStatus,
  purchaseLineAmount,
  receiveQuantity,
} from "./purchases.math.js";
import { recordSupplierPurchase } from "./suppliers.service.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

type OrderWithItems = PurchaseOrder & {
  supplier: Supplier;
  items: Array<PurchaseOrderItem & { product: { name: string } }>;
};

function mapOrderDto(order: OrderWithItems): PurchaseOrderDto {
  const orderedTotal = order.items.reduce(
    (sum, item) => sum.plus(purchaseLineAmount(item.unitCost, item.quantityOrdered)),
    new Prisma.Decimal(0)
  );
  const receivedTotal = order.items.reduce(
    (sum, item) => sum.plus(purchaseLineAmount(item.unitCost, item.quantityReceived)),
    new Prisma.Decimal(0)
  );
  return {
    id: order.id,
    businessId: order.businessId,
    supplierId: order.supplierId,
    supplierName: order.supplier.name,
    status: order.status,
    notes: order.notes,
    itemCount: order.items.length,
    orderedTotal: toNumber2(orderedTotal),
    receivedTotal: toNumber2(receivedTotal),
    createdAt: order.createdAt.toISOString(),
  };
}

function mapDetail(order: OrderWithItems): PurchaseOrderDetailDto {
  return {
    ...mapOrderDto(order),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      description: item.description,
      quantityOrdered: toNumber2(item.quantityOrdered),
      quantityReceived: toNumber2(item.quantityReceived),
      unitCost: toNumber2(item.unitCost),
      lineTotal: toNumber2(purchaseLineAmount(item.unitCost, item.quantityOrdered)),
    })),
  };
}

const orderInclude = {
  supplier: true,
  items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
};

export async function listPurchaseOrders(businessId: string): Promise<PurchaseOrderDto[]> {
  const rows = await prisma.purchaseOrder.findMany({
    where: { businessId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(mapOrderDto);
}

export async function getPurchaseOrder(
  businessId: string,
  orderId: string
): Promise<PurchaseOrderDetailDto> {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "PURCHASE_NOT_FOUND", "Purchase order not found");
  return mapDetail(order);
}

export async function createPurchaseOrder(
  businessId: string,
  recordedById: string,
  input: CreatePurchaseOrderRequest
): Promise<PurchaseOrderDetailDto> {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { businessId_idempotencyKey: { businessId, idempotencyKey: input.idempotencyKey } },
    include: orderInclude,
  });
  if (existing) return mapDetail(existing);

  if (!input.lines.length) {
    throw new AppError(400, "EMPTY_ORDER", "Add at least one product");
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, businessId },
  });
  if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const productIds = [...new Set(input.lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { businessId, id: { in: productIds } },
  });
  if (products.length !== productIds.length) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "One of the products was not found in this shop");
  }
  const productById = new Map(products.map((row) => [row.id, row]));
  const itemData = input.lines.map((line) => {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitCost) || line.unitCost <= 0) {
      throw new AppError(400, "INVALID_LINE", "Each line needs a positive quantity and cost");
    }
    const product = productById.get(line.productId);
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "One of the products was not found in this shop");
    return {
      businessId,
      productId: product.id,
      description: product.name.slice(0, 160),
      quantityOrdered: new Prisma.Decimal(line.quantity.toFixed(2)),
      unitCost: new Prisma.Decimal(line.unitCost.toFixed(2)),
    };
  });

  const created = await prisma.purchaseOrder.create({
    data: {
      businessId,
      supplierId: supplier.id,
      recordedById,
      notes: input.notes?.trim() || null,
      idempotencyKey: input.idempotencyKey,
      status: "ORDERED",
      items: { create: itemData },
    },
    include: orderInclude,
  });

  return mapDetail(created);
}

export async function cancelPurchaseOrder(
  businessId: string,
  orderId: string
): Promise<PurchaseOrderDetailDto> {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "PURCHASE_NOT_FOUND", "Purchase order not found");
  if (order.items.some((item) => item.quantityReceived.gt(0))) {
    throw new AppError(409, "ALREADY_RECEIVED", "This order already has received stock and cannot be cancelled");
  }
  const updated = await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
    include: orderInclude,
  });
  return mapDetail(updated);
}

export async function receivePurchaseOrder(
  businessId: string,
  recordedById: string,
  orderId: string,
  input: ReceivePurchaseRequest
): Promise<PurchaseOrderDetailDto> {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: orderId, businessId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "PURCHASE_NOT_FOUND", "Purchase order not found");
  if (order.status === "CANCELLED" || order.status === "RECEIVED") {
    throw new AppError(409, "NOT_RECEIVABLE", "This purchase order cannot receive more stock");
  }
  if (!input.lines.length) {
    throw new AppError(400, "EMPTY_RECEIVE", "Add at least one quantity to receive");
  }

  const paymentMethod: PaymentMethod = input.paymentMethod ?? "CASH";
  const itemsById = new Map(order.items.map((item) => [item.id, item]));

  for (const line of input.lines) {
    const item = itemsById.get(line.itemId);
    if (!item || item.businessId !== businessId) {
      throw new AppError(404, "LINE_NOT_FOUND", "A receive line does not belong to this order");
    }
    const incoming = new Prisma.Decimal(line.quantity.toFixed(2));
    const qty = receiveQuantity(item.quantityOrdered, item.quantityReceived, incoming);
    if (qty.lte(0)) continue;

    const amount = purchaseLineAmount(item.unitCost, qty);
    const txKey = `r:${input.idempotencyKey.slice(0, 36)}:${item.id.replace(/-/g, "").slice(0, 16)}`;
    const existingTx = await prisma.transaction.findUnique({
      where: { businessId_idempotencyKey: { businessId, idempotencyKey: txKey } },
    });
    if (existingTx) continue;

    const tx = await createTransaction(businessId, recordedById, {
      type: "EXPENSE",
      category: "INVENTORY_PURCHASE",
      amount: toNumber2(amount),
      description: `Received ${toNumber2(qty)} ${item.description} from ${order.supplier.name}`,
      paymentMethod,
      counterpartyName: order.supplier.name,
      productId: item.productId,
      quantity: toNumber2(qty),
      purchaseOrderId: order.id,
      source: "MANUAL",
      idempotencyKey: txKey,
    });

    const nextReceived = item.quantityReceived.plus(qty);
    await prisma.purchaseOrderItem.update({
      where: { id: item.id },
      data: { quantityReceived: nextReceived },
    });
    item.quantityReceived = nextReceived;

    if (paymentMethod === "CREDIT") {
      await recordSupplierPurchase(
        businessId,
        order.supplierId,
        amount,
        order.id,
        tx.id,
        `Received ${item.description}`
      );
    }

    await updateProduct(
      businessId,
      item.productId,
      { costPrice: toNumber2(item.unitCost) },
      recordedById
    );
  }

  const refreshedItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: order.id, businessId },
  });
  const status = nextPurchaseStatus(refreshedItems, order.status);
  const updated = await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status },
    include: orderInclude,
  });
  return mapDetail(updated);
}

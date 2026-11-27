import { Prisma, type Supplier } from "@prisma/client";
import type {
  CreateSupplierRequest,
  RecordSupplierPaymentRequest,
  SupplierDetailDto,
  SupplierDto,
  SupplierLedgerEntryDto,
  UpdateSupplierRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { toNameKey } from "../customers/customers.service.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function getSupplierBalance(
  businessId: string,
  supplierId: string
): Promise<Prisma.Decimal> {
  const result = await prisma.supplierLedger.aggregate({
    where: { businessId, supplierId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}

function mapSupplierDto(supplier: Supplier, balance: Prisma.Decimal): SupplierDto {
  return {
    id: supplier.id,
    businessId: supplier.businessId,
    name: supplier.name,
    phone: supplier.phone,
    notes: supplier.notes,
    outstandingBalance: toNumber2(balance),
    createdAt: supplier.createdAt.toISOString(),
  };
}

export async function listSuppliers(businessId: string): Promise<SupplierDto[]> {
  const rows = await prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
  const balances = await Promise.all(rows.map((row) => getSupplierBalance(businessId, row.id)));
  return rows.map((row, index) => mapSupplierDto(row, balances[index]));
}

export async function getSupplier(businessId: string, supplierId: string): Promise<SupplierDetailDto> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });
  if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const [balance, ledger] = await Promise.all([
    getSupplierBalance(businessId, supplier.id),
    prisma.supplierLedger.findMany({
      where: { supplierId: supplier.id, businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const ledgerDto: SupplierLedgerEntryDto[] = ledger.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: toNumber2(entry.amount),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
  }));

  return { ...mapSupplierDto(supplier, balance), ledger: ledgerDto };
}

export async function createSupplier(
  businessId: string,
  input: CreateSupplierRequest
): Promise<SupplierDto> {
  const name = input.name.trim();
  if (name.length < 2) throw new AppError(400, "INVALID_NAME", "Supplier name is too short");
  try {
    const created = await prisma.supplier.create({
      data: {
        businessId,
        name,
        nameKey: toNameKey(name),
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    return mapSupplierDto(created, new Prisma.Decimal(0));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "SUPPLIER_EXISTS", "A supplier with this name already exists");
    }
    throw err;
  }
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  input: UpdateSupplierRequest
): Promise<SupplierDto> {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });
  if (!existing) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");
  const name = input.name?.trim();
  const updated = await prisma.supplier.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name, nameKey: toNameKey(name) } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
  });
  return mapSupplierDto(updated, await getSupplierBalance(businessId, updated.id));
}

export async function deleteSupplier(businessId: string, supplierId: string): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });
  if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");
  const [balance, openOrders] = await Promise.all([
    getSupplierBalance(businessId, supplier.id),
    prisma.purchaseOrder.count({
      where: { businessId, supplierId: supplier.id, status: { in: ["ORDERED", "PARTIAL"] } },
    }),
  ]);
  if (balance.gt(0)) {
    throw new AppError(409, "SUPPLIER_HAS_BALANCE", "Settle the outstanding balance before deleting this supplier");
  }
  if (openOrders > 0) {
    throw new AppError(409, "SUPPLIER_HAS_ORDERS", "Cancel or receive open purchase orders first");
  }
  await prisma.supplier.delete({ where: { id: supplier.id } });
}

/**
 * Paying a supplier must not create a second expense. The receive already recorded the purchase cost.
 */
export async function recordSupplierPayment(
  businessId: string,
  supplierId: string,
  input: RecordSupplierPaymentRequest
): Promise<SupplierDetailDto> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "Payment amount must be greater than 0");
  }
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });
  if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");

  const sourceKey = `pay:${input.idempotencyKey}`;
  const duplicate = await prisma.supplierLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (duplicate) return getSupplier(businessId, supplierId);

  const balance = await getSupplierBalance(businessId, supplier.id);
  const payment = new Prisma.Decimal(input.amount.toFixed(2));
  if (payment.gt(balance)) {
    throw new AppError(400, "PAYMENT_EXCEEDS_BALANCE", "Payment is larger than what this supplier is owed");
  }

  await prisma.supplierLedger.create({
    data: {
      businessId,
      supplierId,
      type: "PAYMENT",
      amount: payment.negated(),
      note: input.note?.trim() || `Payment via ${input.paymentMethod ?? "CASH"}`,
      sourceKey,
    },
  });

  return getSupplier(businessId, supplierId);
}

export async function recordSupplierPurchase(
  businessId: string,
  supplierId: string,
  amount: Prisma.Decimal,
  purchaseOrderId: string,
  transactionId: string,
  note: string
): Promise<void> {
  const sourceKey = `po:${transactionId}`;
  const existing = await prisma.supplierLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (existing) return;
  await prisma.supplierLedger.create({
    data: {
      businessId,
      supplierId,
      type: "PURCHASE",
      amount,
      note,
      sourceKey,
      purchaseOrderId,
      transactionId,
    },
  });
}

import { Prisma, type Transaction } from "@prisma/client";
import type {
  CreateTransactionRequest,
  DateRangePreset,
  PaymentMethod,
  TransactionCategory,
  TransactionDto,
  TransactionType,
  UpdateTransactionRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { getEatDateWindow } from "../../utils/eatDate.js";

const INCOME_CATEGORIES = new Set<TransactionCategory>([
  "SALES",
  "SERVICE_INCOME",
  "OTHER_INCOME",
]);

const EXPENSE_CATEGORIES = new Set<TransactionCategory>([
  "INVENTORY_PURCHASE",
  "TRANSPORT",
  "RENT",
  "UTILITIES",
  "SALARY",
  "FOOD",
  "MARKETING",
  "OTHER_EXPENSE",
]);

export function coerceCategoryForType(
  type: TransactionType,
  category: TransactionCategory
): TransactionCategory {
  if (type === "INCOME") {
    return INCOME_CATEGORIES.has(category) ? category : "OTHER_INCOME";
  }
  return EXPENSE_CATEGORIES.has(category) ? category : "OTHER_EXPENSE";
}

export function mapTransactionDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    businessId: tx.businessId,
    recordedById: tx.recordedById,
    type: tx.type,
    category: tx.category,
    amount: Number(tx.amount.toFixed(2)),
    currency: "ETB",
    description: tx.description,
    paymentMethod: tx.paymentMethod,
    counterpartyName: tx.counterpartyName,
    transactionDate: tx.transactionDate.toISOString(),
    source: tx.source,
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
  };
}

export interface ListTransactionsFilter {
  range?: DateRangePreset;
  type?: TransactionType;
  category?: TransactionCategory;
  paymentMethod?: PaymentMethod;
  includeVoided?: boolean;
  limit?: number;
}

export async function listTransactions(
  businessId: string,
  filters: ListTransactionsFilter = {}
): Promise<{ items: TransactionDto[]; totalCount: number }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);

  let dateFilter: Prisma.DateTimeFilter | undefined;
  if (filters.range && filters.range !== "all") {
    const window = getEatDateWindow(filters.range);
    dateFilter = {
      gte: window.startUtc,
      lte: window.endUtc,
    };
  }

  const where: Prisma.TransactionWhereInput = {
    businessId,
    ...(filters.includeVoided ? {} : { status: "COMPLETED" }),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(dateFilter ? { transactionDate: dateFilter } : {}),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: rows.map(mapTransactionDto),
    totalCount,
  };
}

export async function createTransaction(
  businessId: string,
  recordedById: string,
  input: CreateTransactionRequest
): Promise<TransactionDto> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "Transaction amount must be greater than 0");
  }

  const normalizedKey = input.idempotencyKey.trim();
  const existing = await prisma.transaction.findUnique({
    where: {
      businessId_idempotencyKey: {
        businessId,
        idempotencyKey: normalizedKey,
      },
    },
  });

  if (existing) {
    return mapTransactionDto(existing);
  }

  const parsedDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError(400, "INVALID_DATE", "Invalid transaction date");
  }

  const safeCategory = coerceCategoryForType(input.type, input.category);
  const decimalAmount = new Prisma.Decimal(input.amount.toFixed(2));

  const created = await prisma.transaction.create({
    data: {
      businessId,
      recordedById,
      type: input.type,
      category: safeCategory,
      amount: decimalAmount,
      currency: "ETB",
      description: input.description.trim(),
      paymentMethod: input.paymentMethod ?? "CASH",
      counterpartyName: input.counterpartyName?.trim() || null,
      transactionDate: parsedDate,
      source: input.source ?? "MANUAL",
      idempotencyKey: normalizedKey,
      status: "COMPLETED",
    },
  });

  return mapTransactionDto(created);
}

export async function updateTransaction(
  businessId: string,
  transactionId: string,
  input: UpdateTransactionRequest
): Promise<TransactionDto> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, businessId },
  });

  if (!existing) {
    throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found");
  }

  if (existing.status === "VOIDED") {
    throw new AppError(400, "TRANSACTION_VOIDED", "Cannot edit a voided transaction");
  }

  let parsedDate: Date | undefined;
  if (input.transactionDate !== undefined) {
    parsedDate = new Date(input.transactionDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError(400, "INVALID_DATE", "Invalid transaction date");
    }
  }

  const updated = await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      ...(input.category !== undefined
        ? { category: coerceCategoryForType(existing.type, input.category) }
        : {}),
      ...(input.amount !== undefined
        ? { amount: new Prisma.Decimal(input.amount.toFixed(2)) }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.paymentMethod !== undefined
        ? { paymentMethod: input.paymentMethod }
        : {}),
      ...(input.counterpartyName !== undefined
        ? { counterpartyName: input.counterpartyName?.trim() || null }
        : {}),
      ...(parsedDate ? { transactionDate: parsedDate } : {}),
    },
  });

  return mapTransactionDto(updated);
}

export async function voidTransaction(
  businessId: string,
  transactionId: string
): Promise<TransactionDto> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, businessId },
  });

  if (!existing) {
    throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found");
  }

  if (existing.status === "VOIDED") {
    return mapTransactionDto(existing);
  }

  const voided = await prisma.transaction.update({
    where: { id: existing.id },
    data: { status: "VOIDED" },
  });

  return mapTransactionDto(voided);
}

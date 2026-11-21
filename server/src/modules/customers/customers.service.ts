import { Prisma, type Customer } from "@prisma/client";
import type {
  CreateCustomerRequest,
  CustomerDetailDto,
  CustomerDto,
  CustomerLedgerEntryDto,
  RecordCustomerPaymentRequest,
  UpdateCustomerRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";

export function toNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function getCustomerBalance(customerId: string): Promise<Prisma.Decimal> {
  const result = await prisma.customerLedger.aggregate({
    where: { customerId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}

function mapCustomerDto(customer: Customer, balance: Prisma.Decimal): CustomerDto {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    outstandingBalance: toNumber2(balance),
    createdAt: customer.createdAt.toISOString(),
  };
}

export async function listCustomers(businessId: string): Promise<CustomerDto[]> {
  const rows = await prisma.customer.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
  const balances = await Promise.all(rows.map((row) => getCustomerBalance(row.id)));
  return rows.map((row, index) => mapCustomerDto(row, balances[index]));
}

export async function getCustomer(
  businessId: string,
  customerId: string
): Promise<CustomerDetailDto> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const [balance, ledger] = await Promise.all([
    getCustomerBalance(customer.id),
    prisma.customerLedger.findMany({
      where: { customerId: customer.id, businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const ledgerDto: CustomerLedgerEntryDto[] = ledger.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: toNumber2(entry.amount),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
  }));

  return { ...mapCustomerDto(customer, balance), ledger: ledgerDto };
}

export async function createCustomer(
  businessId: string,
  input: CreateCustomerRequest
): Promise<CustomerDto> {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new AppError(400, "INVALID_NAME", "Customer name is too short");
  }
  const nameKey = toNameKey(name);
  try {
    const created = await prisma.customer.create({
      data: {
        businessId,
        name,
        nameKey,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    return mapCustomerDto(created, new Prisma.Decimal(0));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "CUSTOMER_EXISTS", "A customer with this name already exists");
    }
    throw err;
  }
}

/** Finds by name, or creates one. Used when a credit sale names a person. */
export async function findOrCreateCustomerByName(
  businessId: string,
  rawName: string
): Promise<Customer> {
  const name = rawName.trim();
  const nameKey = toNameKey(name);
  const existing = await prisma.customer.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
  });
  if (existing) return existing;
  try {
    return await prisma.customer.create({
      data: { businessId, name, nameKey },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.customer.findUniqueOrThrow({
        where: { businessId_nameKey: { businessId, nameKey } },
      });
    }
    throw err;
  }
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: UpdateCustomerRequest
): Promise<CustomerDto> {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });
  if (!existing) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const name = input.name?.trim();
  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name, nameKey: toNameKey(name) } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
  });
  return mapCustomerDto(updated, await getCustomerBalance(updated.id));
}

export async function recordCreditSaleForCustomer(
  businessId: string,
  customerId: string,
  amount: Prisma.Decimal,
  transactionId: string,
  note: string
): Promise<void> {
  const sourceKey = `credit:${transactionId}`;
  const existing = await prisma.customerLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (existing) return;

  await prisma.customerLedger.create({
    data: {
      businessId,
      customerId,
      type: "CREDIT_SALE",
      amount,
      note,
      sourceKey,
      transactionId,
    },
  });
}

export async function reverseCreditSaleForTransaction(
  businessId: string,
  transactionId: string
): Promise<void> {
  const original = await prisma.customerLedger.findFirst({
    where: { businessId, transactionId, type: "CREDIT_SALE" },
  });
  if (!original) return;

  const alreadyReversed = await prisma.customerLedger.findFirst({
    where: { businessId, transactionId, type: "REVERSAL" },
  });
  if (alreadyReversed) return;

  await prisma.customerLedger.create({
    data: {
      businessId,
      customerId: original.customerId,
      type: "REVERSAL",
      amount: original.amount.negated(),
      note: "Voided credit sale",
      transactionId,
    },
  });
}

/**
 * Recording a debt payment must not create a second INCOME row. The original
 * credit sale already counted as revenue; this only reduces what they owe.
 */
export async function recordCustomerPayment(
  businessId: string,
  customerId: string,
  input: RecordCustomerPaymentRequest
): Promise<CustomerDetailDto> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "Payment amount must be greater than 0");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });
  if (!customer) throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");

  const sourceKey = `pay:${input.idempotencyKey}`;
  const duplicate = await prisma.customerLedger.findUnique({
    where: { businessId_sourceKey: { businessId, sourceKey } },
  });
  if (duplicate) return getCustomer(businessId, customerId);

  const balance = await getCustomerBalance(customerId);
  const payment = new Prisma.Decimal(input.amount.toFixed(2));
  if (payment.gt(balance)) {
    throw new AppError(
      400,
      "PAYMENT_EXCEEDS_BALANCE",
      "Payment is larger than the amount this customer owes"
    );
  }

  await prisma.customerLedger.create({
    data: {
      businessId,
      customerId,
      type: "PAYMENT",
      amount: payment.negated(),
      note: input.note?.trim() || `Payment via ${input.paymentMethod ?? "CASH"}`,
      sourceKey,
    },
  });

  return getCustomer(businessId, customerId);
}

export async function findCustomerByName(
  businessId: string,
  rawName: string
): Promise<Customer | null> {
  const nameKey = toNameKey(rawName);
  if (!nameKey) return null;
  return prisma.customer.findUnique({
    where: { businessId_nameKey: { businessId, nameKey } },
  });
}

export async function outstandingTotals(businessId: string) {
  const grouped = await prisma.customerLedger.groupBy({
    by: ["customerId"],
    where: { businessId },
    _sum: { amount: true },
  });
  const owing = grouped.filter((row) => (row._sum.amount ?? new Prisma.Decimal(0)).gt(0));
  const total = owing.reduce(
    (acc, row) => acc.plus(row._sum.amount ?? 0),
    new Prisma.Decimal(0)
  );
  return { customersOwingCount: owing.length, outstandingTotal: total };
}

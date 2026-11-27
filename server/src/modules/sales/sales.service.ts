import { Prisma } from "@prisma/client";
import type { CheckoutSaleRequest, CheckoutSaleResponse } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { createTransaction } from "../transactions/transaction.service.js";
import { applyOrderDiscount, lineSaleAmount } from "./sales.math.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function checkoutSale(
  businessId: string,
  recordedById: string,
  input: CheckoutSaleRequest
): Promise<CheckoutSaleResponse> {
  if (!input.lines.length) {
    throw new AppError(400, "EMPTY_CART", "Add at least one product");
  }

  const productIds = [...new Set(input.lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { businessId, id: { in: productIds } },
  });
  if (products.length !== productIds.length) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "One of the products was not found in this shop");
  }
  const productById = new Map(products.map((row) => [row.id, row]));

  const priced = input.lines.map((line) => {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new AppError(400, "INVALID_LINE", "Each line needs a positive quantity");
    }
    const product = productById.get(line.productId);
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "One of the products was not found in this shop");
    if (product.sellingPrice == null) {
      throw new AppError(400, "NO_SELLING_PRICE", `${product.name} needs a selling price before it can be sold`);
    }
    const quantity = new Prisma.Decimal(line.quantity.toFixed(2));
    return {
      product,
      quantity,
      amount: lineSaleAmount(product.sellingPrice, quantity),
    };
  });

  const subtotal = priced.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
  const discount =
    input.discountAmount != null && Number.isFinite(input.discountAmount)
      ? new Prisma.Decimal(input.discountAmount.toFixed(2))
      : new Prisma.Decimal(0);
  if (discount.lt(0)) {
    throw new AppError(400, "INVALID_DISCOUNT", "Discount cannot be negative");
  }

  let charged: Prisma.Decimal[];
  try {
    charged = applyOrderDiscount(
      priced.map((line) => line.amount),
      discount
    );
  } catch {
    throw new AppError(400, "DISCOUNT_TOO_LARGE", "Discount is larger than this cart can take");
  }

  const paymentMethod = input.paymentMethod ?? "CASH";
  const transactions = [];
  for (const [index, line] of priced.entries()) {
    const amount = charged[index];
    const tx = await createTransaction(businessId, recordedById, {
      type: "INCOME",
      category: "SALES",
      amount: toNumber2(amount),
      description: `${toNumber2(line.quantity)} ${line.product.unit} ${line.product.name}`,
      paymentMethod,
      customerId: input.customerId ?? null,
      counterpartyName: input.counterpartyName ?? null,
      productId: line.product.id,
      quantity: toNumber2(line.quantity),
      source: "MANUAL",
      idempotencyKey: `c:${input.idempotencyKey.slice(0, 36)}:${index}`,
    });
    transactions.push(tx);
  }

  const total = charged.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
  return {
    transactions,
    subtotal: toNumber2(subtotal),
    discountAmount: toNumber2(discount),
    total: toNumber2(total),
  };
}

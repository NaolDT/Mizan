import { Prisma } from "@prisma/client";
import type { CashFlowDailyPoint, PaymentMethod, TransactionType } from "@mizan/shared";

export type CashFlowTxRow = {
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: Prisma.Decimal;
  transactionDate: Date;
};

export type CashFlowCollectionRow = {
  amount: Prisma.Decimal;
  createdAt: Date;
};

export type CashFlowTotals = {
  cashIn: Prisma.Decimal;
  telebirrIn: Prisma.Decimal;
  bankIn: Prisma.Decimal;
  creditSales: Prisma.Decimal;
  collections: Prisma.Decimal;
  cashOut: Prisma.Decimal;
  telebirrOut: Prisma.Decimal;
  bankOut: Prisma.Decimal;
  creditPurchases: Prisma.Decimal;
  collectedIn: Prisma.Decimal;
  spent: Prisma.Decimal;
  netCashMovement: Prisma.Decimal;
};

const ZERO = () => new Prisma.Decimal(0);

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

/**
 * Credit sales raise revenue, not cash. Customer PAYMENT ledger lines are cash
 * collected against earlier credit sales and must not be counted as new income.
 */
export function accumulateCashFlow(params: {
  transactions: CashFlowTxRow[];
  collections: CashFlowCollectionRow[];
  dateKeys: string[];
  formatDateKey: (date: Date) => string;
}): { totals: CashFlowTotals; dailySeries: CashFlowDailyPoint[] } {
  const totals: CashFlowTotals = {
    cashIn: ZERO(),
    telebirrIn: ZERO(),
    bankIn: ZERO(),
    creditSales: ZERO(),
    collections: ZERO(),
    cashOut: ZERO(),
    telebirrOut: ZERO(),
    bankOut: ZERO(),
    creditPurchases: ZERO(),
    collectedIn: ZERO(),
    spent: ZERO(),
    netCashMovement: ZERO(),
  };

  const daily = new Map<string, { collected: Prisma.Decimal; spent: Prisma.Decimal }>();
  for (const key of params.dateKeys) {
    daily.set(key, { collected: ZERO(), spent: ZERO() });
  }

  const bumpDay = (key: string, field: "collected" | "spent", amount: Prisma.Decimal) => {
    const entry = daily.get(key) ?? { collected: ZERO(), spent: ZERO() };
    entry[field] = entry[field].plus(amount);
    daily.set(key, entry);
  };

  for (const row of params.transactions) {
    const dayKey = params.formatDateKey(row.transactionDate);
    if (row.type === "INCOME") {
      if (row.paymentMethod === "CASH") {
        totals.cashIn = totals.cashIn.plus(row.amount);
        bumpDay(dayKey, "collected", row.amount);
      } else if (row.paymentMethod === "TELEBIRR") {
        totals.telebirrIn = totals.telebirrIn.plus(row.amount);
        bumpDay(dayKey, "collected", row.amount);
      } else if (row.paymentMethod === "BANK") {
        totals.bankIn = totals.bankIn.plus(row.amount);
        bumpDay(dayKey, "collected", row.amount);
      } else {
        totals.creditSales = totals.creditSales.plus(row.amount);
      }
    } else if (row.paymentMethod === "CASH") {
      totals.cashOut = totals.cashOut.plus(row.amount);
      bumpDay(dayKey, "spent", row.amount);
    } else if (row.paymentMethod === "TELEBIRR") {
      totals.telebirrOut = totals.telebirrOut.plus(row.amount);
      bumpDay(dayKey, "spent", row.amount);
    } else if (row.paymentMethod === "BANK") {
      totals.bankOut = totals.bankOut.plus(row.amount);
      bumpDay(dayKey, "spent", row.amount);
    } else {
      totals.creditPurchases = totals.creditPurchases.plus(row.amount);
    }
  }

  for (const row of params.collections) {
    const collected = row.amount.abs();
    totals.collections = totals.collections.plus(collected);
    bumpDay(params.formatDateKey(row.createdAt), "collected", collected);
  }

  totals.collectedIn = totals.cashIn.plus(totals.telebirrIn).plus(totals.bankIn).plus(totals.collections);
  totals.spent = totals.cashOut.plus(totals.telebirrOut).plus(totals.bankOut);
  totals.netCashMovement = totals.collectedIn.minus(totals.spent);

  const dailySeries: CashFlowDailyPoint[] = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      collected: toNumber2(vals.collected),
      spent: toNumber2(vals.spent),
      net: toNumber2(vals.collected.minus(vals.spent)),
    }));

  return { totals, dailySeries };
}

export function serializeCashTotals(totals: CashFlowTotals) {
  return {
    cashIn: toNumber2(totals.cashIn),
    telebirrIn: toNumber2(totals.telebirrIn),
    bankIn: toNumber2(totals.bankIn),
    creditSales: toNumber2(totals.creditSales),
    collections: toNumber2(totals.collections),
    cashOut: toNumber2(totals.cashOut),
    telebirrOut: toNumber2(totals.telebirrOut),
    bankOut: toNumber2(totals.bankOut),
    creditPurchases: toNumber2(totals.creditPurchases),
    collectedIn: toNumber2(totals.collectedIn),
    spent: toNumber2(totals.spent),
    netCashMovement: toNumber2(totals.netCashMovement),
  };
}

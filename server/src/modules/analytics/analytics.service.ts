import { Prisma } from "@prisma/client";
import type {
  CategoryBreakdownItem,
  DailyCashFlowPoint,
  FinancialSummaryDto,
  TransactionCategory,
  TransactionDto,
  TransactionType,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import {
  formatEatDateKey,
  formatEatIsoTimestamp,
  getEatDateWindow,
} from "../../utils/eatDate.js";
import { mapTransactionDto } from "../transactions/transaction.service.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

function computeDeltaPct(current: Prisma.Decimal, previous: Prisma.Decimal): number | null {
  if (previous.lte(0)) {
    return null;
  }
  const diff = current.minus(previous);
  return Number(diff.div(previous).mul(100).toFixed(1));
}

/**
 * Deterministic SQL + Prisma.Decimal Financial Summary Engine.
 * Zero LLM involvement — guarantees 100% exact monetary math.
 */
export async function getFinancialSummary(
  businessId: string,
  range: "today" | "week" | "month" = "month"
): Promise<FinancialSummaryDto> {
  const now = new Date();
  const todayWindow = getEatDateWindow("today", now);
  const periodWindow = getEatDateWindow(range, now);

  const [todayRows, periodRows, prevPeriodRows, creditRows] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        transactionDate: {
          gte: todayWindow.startUtc,
          lte: todayWindow.endUtc,
        },
      },
      select: {
        type: true,
        amount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        transactionDate: {
          gte: periodWindow.startUtc,
          lte: periodWindow.endUtc,
        },
      },
      select: {
        type: true,
        category: true,
        amount: true,
        transactionDate: true,
      },
      orderBy: { transactionDate: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        transactionDate: {
          gte: periodWindow.previousStartUtc,
          lte: periodWindow.previousEndUtc,
        },
      },
      select: {
        type: true,
        amount: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId,
        status: "COMPLETED",
        type: "INCOME",
        paymentMethod: "CREDIT",
      },
      _sum: { amount: true },
    }),
  ]);

  let todayIncome = new Prisma.Decimal(0);
  let todayExpense = new Prisma.Decimal(0);
  for (const row of todayRows) {
    if (row.type === "INCOME") {
      todayIncome = todayIncome.plus(row.amount);
    } else {
      todayExpense = todayExpense.plus(row.amount);
    }
  }

  let periodIncome = new Prisma.Decimal(0);
  let periodExpense = new Prisma.Decimal(0);
  let inventoryPurchases = new Prisma.Decimal(0);

  const categoryTotals = new Map<
    string,
    { category: TransactionCategory; type: TransactionType; amount: Prisma.Decimal; count: number }
  >();

  const dailyBuckets = new Map<
    string,
    { income: Prisma.Decimal; expense: Prisma.Decimal }
  >();

  // Pre-seed continuous daily buckets across the requested period window
  const dayMs = 24 * 60 * 60 * 1000;
  const maxDays = range === "today" ? 1 : range === "week" ? 7 : 31;
  for (
    let cursorMs = periodWindow.startUtc.getTime(), guard = 0;
    cursorMs <= periodWindow.endUtc.getTime() && guard <= maxDays;
    cursorMs += dayMs, guard++
  ) {
    const key = formatEatDateKey(new Date(cursorMs + 12 * 60 * 60 * 1000));
    dailyBuckets.set(key, {
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
    });
  }

  for (const row of periodRows) {
    if (row.type === "INCOME") {
      periodIncome = periodIncome.plus(row.amount);
    } else {
      periodExpense = periodExpense.plus(row.amount);
      if (row.category === "INVENTORY_PURCHASE") {
        inventoryPurchases = inventoryPurchases.plus(row.amount);
      }
    }

    const catKey = `${row.type}:${row.category}`;
    const existingCat = categoryTotals.get(catKey);
    if (existingCat) {
      existingCat.amount = existingCat.amount.plus(row.amount);
      existingCat.count += 1;
    } else {
      categoryTotals.set(catKey, {
        category: row.category,
        type: row.type,
        amount: row.amount,
        count: 1,
      });
    }

    const dayKey = formatEatDateKey(row.transactionDate);
    const dayEntry = dailyBuckets.get(dayKey) ?? {
      income: new Prisma.Decimal(0),
      expense: new Prisma.Decimal(0),
    };
    if (row.type === "INCOME") {
      dayEntry.income = dayEntry.income.plus(row.amount);
    } else {
      dayEntry.expense = dayEntry.expense.plus(row.amount);
    }
    dailyBuckets.set(dayKey, dayEntry);
  }

  let prevIncome = new Prisma.Decimal(0);
  let prevExpense = new Prisma.Decimal(0);
  for (const row of prevPeriodRows) {
    if (row.type === "INCOME") {
      prevIncome = prevIncome.plus(row.amount);
    } else {
      prevExpense = prevExpense.plus(row.amount);
    }
  }

  const byCategory: CategoryBreakdownItem[] = Array.from(categoryTotals.values())
    .sort((a, b) => b.amount.comparedTo(a.amount))
    .map((entry) => {
      const denominator = entry.type === "INCOME" ? periodIncome : periodExpense;
      const sharePct = denominator.gt(0)
        ? Number(entry.amount.div(denominator).mul(100).toFixed(1))
        : 0;
      return {
        category: entry.category,
        type: entry.type,
        amount: toNumber2(entry.amount),
        transactionCount: entry.count,
        sharePct,
      };
    });

  const dailySeries: DailyCashFlowPoint[] = Array.from(dailyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      income: toNumber2(vals.income),
      expense: toNumber2(vals.expense),
      netProfit: toNumber2(vals.income.minus(vals.expense)),
    }));

  const operatingExpensesExclInventory = periodExpense.minus(inventoryPurchases);
  const operatingProfitExclInventory = periodIncome.minus(operatingExpensesExclInventory);
  const netCashFlow = periodIncome.minus(periodExpense);
  const creditReceivableTotal = creditRows._sum.amount ?? new Prisma.Decimal(0);

  return {
    currency: "ETB",
    range,
    generatedAtEat: formatEatIsoTimestamp(now),
    today: {
      income: toNumber2(todayIncome),
      expense: toNumber2(todayExpense),
      netProfit: toNumber2(todayIncome.minus(todayExpense)),
      transactionCount: todayRows.length,
    },
    period: {
      income: toNumber2(periodIncome),
      expense: toNumber2(periodExpense),
      operatingProfitExclInventory: toNumber2(operatingProfitExclInventory),
      inventoryPurchases: toNumber2(inventoryPurchases),
      netCashFlow: toNumber2(netCashFlow),
      creditReceivableTotal: toNumber2(creditReceivableTotal),
      transactionCount: periodRows.length,
      vsPreviousIncomePct: computeDeltaPct(periodIncome, prevIncome),
      vsPreviousExpensePct: computeDeltaPct(periodExpense, prevExpense),
    },
    byCategory,
    dailySeries,
  };
}

export interface AiBusinessContextSnapshot {
  business: {
    name: string;
    category: string;
    location: string | null;
    currency: "ETB";
  };
  eatTodayDate: string;
  eatIsoTimestamp: string;
  weekSummary: FinancialSummaryDto["period"];
  monthSummary: FinancialSummaryDto;
  recentTransactions: TransactionDto[];
}

export async function buildAiContextSnapshot(
  businessId: string
): Promise<AiBusinessContextSnapshot> {
  const [business, weekSummary, monthSummary, recentRows] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { name: true, category: true, location: true },
    }),
    getFinancialSummary(businessId, "week"),
    getFinancialSummary(businessId, "month"),
    prisma.transaction.findMany({
      where: { businessId, status: "COMPLETED" },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  return {
    business: {
      name: business.name,
      category: business.category,
      location: business.location,
      currency: "ETB",
    },
    eatTodayDate: formatEatDateKey(),
    eatIsoTimestamp: formatEatIsoTimestamp(),
    weekSummary: weekSummary.period,
    monthSummary,
    recentTransactions: recentRows.map(mapTransactionDto),
  };
}

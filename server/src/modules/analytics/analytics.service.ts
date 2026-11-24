import { Prisma } from "@prisma/client";
import type {
  BusinessInsightsDto,
  CategoryBreakdownItem,
  DailyCashFlowPoint,
  FinancialSummaryDto,
  InsightItemDto,
  LanguageCode,
  PaymentMethod,
  PaymentMethodBreakdownItem,
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
import {
  getInventoryValuation,
  getProductProfitability,
  listLowStock,
} from "../inventory/inventory.service.js";
import { outstandingTotals } from "../customers/customers.service.js";
import { mapTransactionDto } from "../transactions/transaction.service.js";

function toNumber2(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "TELEBIRR", "BANK", "CREDIT"];

function incomeByPaymentMethod(
  rows: Array<{ type: TransactionType; paymentMethod: PaymentMethod; amount: Prisma.Decimal }>
): PaymentMethodBreakdownItem[] {
  const totals = new Map<PaymentMethod, { income: Prisma.Decimal; count: number }>(
    PAYMENT_METHODS.map((method) => [method, { income: new Prisma.Decimal(0), count: 0 }])
  );
  for (const row of rows) {
    if (row.type !== "INCOME") continue;
    const entry = totals.get(row.paymentMethod);
    if (!entry) continue;
    entry.income = entry.income.plus(row.amount);
    entry.count += 1;
  }
  return PAYMENT_METHODS.map((method) => {
    const entry = totals.get(method)!;
    return {
      method,
      income: toNumber2(entry.income),
      transactionCount: entry.count,
    };
  });
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

  const [todayRows, periodRows, prevPeriodRows, creditRows, customerOutstanding] = await Promise.all([
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
        paymentMethod: true,
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
        customerId: null,
      },
      _sum: { amount: true },
    }),
    outstandingTotals(businessId),
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
  const unlinkedCredit = creditRows._sum.amount ?? new Prisma.Decimal(0);
  const creditReceivableTotal = customerOutstanding.outstandingTotal.plus(unlinkedCredit);

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
    byPaymentMethod: incomeByPaymentMethod(periodRows),
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
  products: Array<{ name: string; quantityOnHand: number; unit: string; isLowStock: boolean }>;
  topSelling: Array<{ name: string; revenue: number; quantitySold: number }>;
  inventoryValuation: { costValue: number; retailValue: number };
  customersOwing: Array<{ name: string; outstandingBalance: number }>;
}

export async function buildAiContextSnapshot(
  businessId: string
): Promise<AiBusinessContextSnapshot> {
  const [business, weekSummary, monthSummary, recentRows, products, customers, profits, valuation] =
    await Promise.all([
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
    prisma.product.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      take: 20,
      select: { name: true, quantityOnHand: true, unit: true, lowStockThreshold: true },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      take: 20,
      select: { id: true, name: true },
    }),
    getProductProfitability(businessId, "month"),
    getInventoryValuation(businessId),
  ]);

  const customerBalances = await Promise.all(
    customers.map(async (c) => {
      const sum = await prisma.customerLedger.aggregate({
        where: { customerId: c.id },
        _sum: { amount: true },
      });
      return {
        name: c.name,
        outstandingBalance: Number((sum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2)),
      };
    })
  );

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
    products: products.map((p) => ({
      name: p.name,
      quantityOnHand: Number(p.quantityOnHand.toFixed(2)),
      unit: p.unit,
      isLowStock: p.lowStockThreshold.gt(0) && p.quantityOnHand.lte(p.lowStockThreshold),
    })),
    topSelling: profits
      .filter((p) => p.quantitySold > 0)
      .slice(0, 5)
      .map((p) => ({ name: p.name, revenue: p.revenue, quantitySold: p.quantitySold })),
    inventoryValuation: { costValue: valuation.costValue, retailValue: valuation.retailValue },
    customersOwing: customerBalances.filter((c) => c.outstandingBalance > 0),
  };
}

function insightCopy(
  language: LanguageCode,
  id: string,
  vars: Record<string, string>
): { title: string; body: string } {
  const fill = (template: string) =>
    Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);

  const copies: Record<
    string,
    Record<LanguageCode, { title: string; body: string }>
  > = {
    "need-more-activity": {
      en: {
        title: "Need more activity",
        body: "Record a few more sales and expenses so Mizan can describe how the business is doing.",
      },
      am: {
        title: "ተጨማሪ እንቅስቃሴ ያስፈልጋል",
        body: "ንግድዎ እንዴት እንደሚሄድ ለመግለጽ ጥቂት ሽያጭና ወጪዎችን ይመዝግቡ።",
      },
      om: {
        title: "Sochiin dabalataa barbaachisa",
        body: "Mizan akka daldala kee ibsuuf gurgurtaa fi baasii muraasa galmeessi.",
      },
    },
    "income-down": {
      en: {
        title: "Income is down",
        body: "Recorded income is {pct}% lower than the previous period.",
      },
      am: {
        title: "ገቢ ቀንሷል",
        body: "የተመዘገበ ገቢ ከቀድሞው ጊዜ {pct}% ያነሰ ነው።",
      },
      om: {
        title: "Galiin gadi bu'eera",
        body: "Galiin galmaa'e yeroo darban irra {pct}% gadi aana.",
      },
    },
    "income-up": {
      en: {
        title: "Income is up",
        body: "Recorded income is {pct}% higher than the previous period.",
      },
      am: {
        title: "ገቢ ጨምሯል",
        body: "የተመዘገበ ገቢ ከቀድሞው ጊዜ {pct}% ይበልጣል።",
      },
      om: {
        title: "Galiin ol ka'eera",
        body: "Galiin galmaa'e yeroo darban irra {pct}% ol aana.",
      },
    },
    "expenses-up": {
      en: {
        title: "Expenses increased",
        body: "Recorded expenses are {pct}% higher than the previous period.",
      },
      am: {
        title: "ወጪ ጨምሯል",
        body: "የተመዘገበ ወጪ ከቀድሞው ጊዜ {pct}% ይበልጣል።",
      },
      om: {
        title: "Baasiin dabaleera",
        body: "Baasiin galmaa'e yeroo darban irra {pct}% ol aana.",
      },
    },
    "expenses-over-income": {
      en: {
        title: "More expenses than income",
        body: "This period's recorded expenses are higher than recorded income.",
      },
      am: {
        title: "ወጪ ከገቢ በላይ ነው",
        body: "በዚህ ጊዜ የተመዘገበ ወጪ ከተመዘገበ ገቢ ይበልጣል።",
      },
      om: {
        title: "Baasiin galii ol aana",
        body: "Yeroo kana baasiin galmaa'e galii galmaa'e ol aana.",
      },
    },
    "credit-outstanding": {
      en: {
        title: "Money still owed to you",
        body: "{count} customer(s) owe a total of {amount} ETB.",
      },
      am: {
        title: "የሚቀረዎት ገንዘብ አለ",
        body: "{count} ደንበኛ በድምሩ {amount} ETB ይቀሩዎታል።",
      },
      om: {
        title: "Maallaqa si hafaa jira",
        body: "Maamiltoota {count} waliigala {amount} ETB si hafaa.",
      },
    },
    "low-stock": {
      en: {
        title: "Low stock",
        body: "{count} products are low: {names}.",
      },
      am: {
        title: "ዝቅተኛ ክምችት",
        body: "{count} እቃ ዝቅተኛ ነው፦ {names}።",
      },
      om: {
        title: "Kuufama gadi aanaa",
        body: "Meeshaaleen {count} gadi aanaa: {names}.",
      },
    },
    steady: {
      en: {
        title: "No warnings right now",
        body: "Income, expenses and stock look steady compared with the previous period.",
      },
      am: {
        title: "አሁን ማስጠንቀቂያ የለም",
        body: "ገቢ፣ ወጪ እና ክምችት ከቀድሞው ጊዜ ጋር ሲነፃፀሩ የተረጋጉ ናቸው።",
      },
      om: {
        title: "Ammaaf akeekkachiisni hin jiru",
        body: "Galii, baasii fi kuufamni yeroo darban wajjin wal bira qabamee tasgabbaya.",
      },
    },
    "best-seller": {
      en: {
        title: "Best-selling product",
        body: "{name} brought in {amount} ETB this period ({qty} sold).",
      },
      am: {
        title: "በብዛት የተሸጠ እቃ",
        body: "{name} በዚህ ጊዜ {amount} ETB አስገብቷል ({qty} ተሽጧል)።",
      },
      om: {
        title: "Meeshaa gurgurtaa ol aanaa",
        body: "{name} yeroo kana {amount} ETB fideera ({qty} gurgurameera).",
      },
    },
    "top-profit": {
      en: {
        title: "Highest estimated profit",
        body: "{name} has about {amount} ETB gross profit this period from recorded cost and selling prices.",
      },
      am: {
        title: "ከፍተኛ ግምታዊ ትርፍ",
        body: "{name} በዚህ ጊዜ ከተመዘገበ ወጪና የሽያጭ ዋጋ ወደ {amount} ETB ጠቅላላ ትርፍ አለው።",
      },
      om: {
        title: "Bu'aa tilmaamaa ol aanaa",
        body: "{name} yeroo kana gatii bittaa fi gurgurtaa galmaa'e irraa {amount} ETB bu'aa waliigalaa qaba.",
      },
    },
    "slow-moving": {
      en: {
        title: "Slow-moving stock",
        body: "{count} products had no linked sales this period: {names}.",
      },
      am: {
        title: "በዝግታ የሚሸጥ እቃ",
        body: "{count} እቃ በዚህ ጊዜ የተገናኘ ሽያጭ የለውም፦ {names}።",
      },
      om: {
        title: "Meeshaa suuta gurguramu",
        body: "Meeshaaleen {count} yeroo kana gurgurtaa hidhataa hin qaban: {names}.",
      },
    },
    "stock-value": {
      en: {
        title: "Inventory value",
        body: "Stock on hand is worth about {amount} ETB at recorded cost.",
      },
      am: {
        title: "የክምችት ዋጋ",
        body: "በተመዘገበ ወጪ ዋጋ፣ ክምችቱ ወደ {amount} ETB ይገመታል።",
      },
      om: {
        title: "Gatii kuufamaa",
        body: "Kuufamni jiru gatii bittaa irratti {amount} ETB ta'a.",
      },
    },
  };

  const entry = copies[id]?.[language] ?? copies[id]?.en;
  if (!entry) return { title: id, body: "" };
  return { title: fill(entry.title), body: fill(entry.body) };
}

/** Insights are computed from recorded data only — never invented by the LLM. */
export async function getBusinessInsights(
  businessId: string,
  range: "today" | "week" | "month" = "month",
  language: LanguageCode = "en"
): Promise<BusinessInsightsDto> {
  const [summary, lowStock, outstanding, profits, valuation] = await Promise.all([
    getFinancialSummary(businessId, range),
    listLowStock(businessId),
    outstandingTotals(businessId),
    getProductProfitability(businessId, range),
    getInventoryValuation(businessId),
  ]);

  const items: InsightItemDto[] = [];
  const txCount = summary.period.transactionCount;

  const push = (id: string, severity: InsightItemDto["severity"], vars: Record<string, string> = {}) => {
    const copy = insightCopy(language, id, vars);
    items.push({ id, severity, title: copy.title, body: copy.body });
  };

  if (txCount < 3) {
    push("need-more-activity", "info");
  }

  if (summary.period.vsPreviousIncomePct != null && summary.period.vsPreviousIncomePct <= -15) {
    push("income-down", "warning", {
      pct: Math.abs(summary.period.vsPreviousIncomePct).toFixed(1),
    });
  } else if (summary.period.vsPreviousIncomePct != null && summary.period.vsPreviousIncomePct >= 15) {
    push("income-up", "info", {
      pct: summary.period.vsPreviousIncomePct.toFixed(1),
    });
  }

  if (summary.period.vsPreviousExpensePct != null && summary.period.vsPreviousExpensePct >= 20) {
    push("expenses-up", "warning", {
      pct: summary.period.vsPreviousExpensePct.toFixed(1),
    });
  }

  if (txCount >= 3 && summary.period.expense > summary.period.income) {
    push("expenses-over-income", "warning");
  }

  if (outstanding.outstandingTotal.gt(0)) {
    push("credit-outstanding", "warning", {
      count: String(outstanding.customersOwingCount),
      amount: Number(outstanding.outstandingTotal.toFixed(2)).toLocaleString("en-US"),
    });
  }

  if (lowStock.length > 0) {
    push("low-stock", "warning", {
      count: String(lowStock.length),
      names: lowStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(", "),
    });
  }

  const sold = profits.filter((p) => p.quantitySold > 0 || p.revenue > 0);
  if (sold[0]) {
    push("best-seller", "info", {
      name: sold[0].name,
      amount: sold[0].revenue.toLocaleString("en-US"),
      qty: String(sold[0].quantitySold),
    });
  }

  const profitable = [...profits]
    .filter((p) => p.grossProfit != null && p.grossProfit > 0)
    .sort((a, b) => (b.grossProfit ?? 0) - (a.grossProfit ?? 0));
  if (profitable[0] && profitable[0].name !== sold[0]?.name) {
    push("top-profit", "info", {
      name: profitable[0].name,
      amount: (profitable[0].grossProfit ?? 0).toLocaleString("en-US"),
    });
  } else if (profitable[0] && !sold[0]) {
    push("top-profit", "info", {
      name: profitable[0].name,
      amount: (profitable[0].grossProfit ?? 0).toLocaleString("en-US"),
    });
  }

  const slow = profits.filter((p) => p.quantityOnHand > 0 && p.quantitySold === 0 && p.revenue === 0);
  if (slow.length > 0 && sold.length > 0) {
    push("slow-moving", "info", {
      count: String(slow.length),
      names: slow
        .slice(0, 3)
        .map((p) => p.name)
        .join(", "),
    });
  }

  if (valuation.costValue > 0) {
    push("stock-value", "info", {
      amount: valuation.costValue.toLocaleString("en-US"),
    });
  }

  if (items.length === 0 && txCount >= 3) {
    push("steady", "info");
  }

  return {
    generatedAtEat: formatEatIsoTimestamp(),
    range,
    items,
    lowStockCount: lowStock.length,
    customersOwingCount: outstanding.customersOwingCount,
    outstandingTotal: Number(outstanding.outstandingTotal.toFixed(2)),
  };
}

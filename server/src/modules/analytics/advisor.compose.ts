import type {
  AdvisorFindingDto,
  AdvisorProductRefDto,
  AdvisorReportDto,
  BusinessInsightsDto,
  CashFlowDto,
  FinancialSummaryDto,
  InventoryValuationDto,
  LanguageCode,
  ProductDto,
  ProductProfitabilityDto,
} from "@mizan/shared";

function money(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function finding(
  language: LanguageCode,
  id: string,
  severity: AdvisorFindingDto["severity"],
  copies: Record<LanguageCode, { title: string; body: string }>,
  vars: Record<string, string> = {}
): AdvisorFindingDto {
  const fill = (template: string) =>
    Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  const entry = copies[language] ?? copies.en;
  return { id, severity, title: fill(entry.title), body: fill(entry.body) };
}

function toProductRef(row: ProductProfitabilityDto): AdvisorProductRefDto {
  return {
    name: row.name,
    quantityOnHand: row.quantityOnHand,
    quantitySold: row.quantitySold,
    revenue: row.revenue,
    grossProfit: row.grossProfit,
    dailySalesRate: row.dailySalesRate,
    daysOfCover: row.daysOfCover,
    coverConfidence: row.coverConfidence,
  };
}

export function composeAdvisorReport(input: {
  language: LanguageCode;
  summary: FinancialSummaryDto;
  cashFlow: CashFlowDto;
  insights: BusinessInsightsDto;
  profits: ProductProfitabilityDto[];
  lowStock: ProductDto[];
  valuation: InventoryValuationDto;
}): AdvisorReportDto {
  const { language, summary, cashFlow, insights, profits, lowStock, valuation } = input;
  const txCount = summary.period.transactionCount;
  const dataSufficient = txCount >= 3;

  const sold = profits.filter((p) => p.quantitySold > 0 || p.revenue > 0);
  const slow = profits.filter((p) => p.quantityOnHand > 0 && p.quantitySold === 0 && p.revenue === 0);
  const coverWatch = profits.filter(
    (p) => p.daysOfCover != null && p.daysOfCover <= 4 && p.coverConfidence !== "none"
  );
  const lowStockRefs = profits.filter((p) => lowStock.some((item) => item.id === p.productId));

  const overview = dataSufficient
    ? finding(language, "overview-ready", "info", {
        en: {
          title: "Business briefing",
          body: "Recorded income is {income} ETB. Cash collected is {cash} ETB. Credit sales of {credit} ETB are still not cash in the shop.",
        },
        am: {
          title: "የንግድ ማጠቃለያ",
          body: "የተመዘገበ ገቢ {income} ETB ነው። የተሰበሰበ ጥሬ ገንዘብ {cash} ETB ነው። {credit} ETB ዱቤ ገና ወደ ሱቁ አልገባም።",
        },
        om: {
          title: "Cuunfaa daldalaa",
          body: "Galiin galmaa'e ETB {income} dha. Maallaqni walitti qabame ETB {cash} dha. Gurgurtaa liqaa ETB {credit} amma suuqii keessa hin jiru.",
        },
      }, {
        income: money(summary.period.income),
        cash: money(cashFlow.collectedIn),
        credit: money(cashFlow.creditSales),
      })
    : finding(language, "overview-need-data", "info", {
        en: {
          title: "Need more records",
          body: "Mizan can brief the shop after a few more sales and expenses are recorded. Figures below use only what is already saved.",
        },
        am: {
          title: "ተጨማሪ መዝገብ ያስፈልጋል",
          body: "ጥቂት ተጨማሪ ሽያጭና ወጪ ከተመዘገቡ በኋላ Mizan ሱቁን ሊገልጽ ይችላል። ከታች ያሉት ቁጥሮች የተቀመጠውን ብቻ ይጠቀማሉ።",
        },
        om: {
          title: "Galmeen dabalataa barbaachisa",
          body: "Gurgurtaa fi baasii muraasa erga galmaa'an booda Mizan suuqii ibsuu danda'a. Lakkoofsi gadii waan ol kaa'ame qofa fayyada.",
        },
      });

  const positives = insights.items.filter(
    (item) => item.severity === "info" && item.id !== "need-more-activity" && item.id !== "steady"
  );
  const problems = insights.items.filter((item) => item.severity === "warning");

  const actions: AdvisorFindingDto[] = [];
  if (coverWatch[0]) {
    const sample = coverWatch[0];
    actions.push(
      finding(language, "action-stock-cover", "warning", {
        en: {
          title: "Plan a reorder",
          body: "{name} may last about {days} days at the recent sales rate. Review remaining stock before it runs out. This is an estimate, not a guarantee.",
        },
        am: {
          title: "እንደገና መግዛት ያቅዱ",
          body: "{name} በቅርብ የሽያጭ ፍጥነት ወደ {days} ቀን ሊቆይ ይችላል። ከመጨረሱ በፊት የቀረውን ክምችት ይመልከቱ። ይህ ግምት ነው እንጂ ዋስትና አይደለም።",
        },
        om: {
          title: "Bittaa haarawa karoorfadhu",
          body: "{name} saffisa gurgurtaa dhiyoo irratti guyyaa {days} turuu danda'a. Osoo hin dhumatin kuufama hafaa ilaali. Tilmaama malee waadaa miti.",
        },
      }, {
        name: sample.name,
        days: String(sample.daysOfCover),
      })
    );
  } else if (lowStock.length > 0) {
    actions.push(
      finding(language, "action-low-stock", "warning", {
        en: {
          title: "Check low stock",
          body: "{count} product(s) are at or below the low-stock level: {names}.",
        },
        am: {
          title: "ዝቅተኛ ክምችት ይመልከቱ",
          body: "{count} እቃ በዝቅተኛ ክምችት ላይ ነው፦ {names}።",
        },
        om: {
          title: "Kuufama gadi aanaa ilaali",
          body: "Meeshaaleen {count} sadarkaa gadi aanaa irratti jiru: {names}.",
        },
      }, {
        count: String(lowStock.length),
        names: lowStock.slice(0, 3).map((p) => p.name).join(", "),
      })
    );
  }

  if (cashFlow.outstanding > 0) {
    actions.push(
      finding(language, "action-collect", "warning", {
        en: {
          title: "Collect outstanding balances",
          body: "{count} customer(s) still owe {amount} ETB. Record a payment when they settle — it is cash in, not a new sale.",
        },
        am: {
          title: "የቀረ ዱቤ ይሰብስቡ",
          body: "{count} ደንበኛ አሁንም {amount} ETB ይቀሩዎታል። ሲከፍሉ ክፍያ ይመዝግቡ — ያ ገቢ አዲስ ሽያጭ ሳይሆን ወደ ሱቁ የገባ ገንዘብ ነው።",
        },
        om: {
          title: "Liqaa hafaa walitti qabi",
          body: "Maamiltoota {count} ammas ETB {amount} si hafuu. Yeroo kaffalan kaffaltii galmeessi — kun gurgurtaa haaraa osoo hin taane maallaqa suuqii seene.",
        },
      }, {
        count: String(cashFlow.customersOwingCount),
        amount: money(cashFlow.outstanding),
      })
    );
  }

  if (dataSufficient && summary.period.expense > summary.period.income) {
    actions.push(
      finding(language, "action-expenses", "warning", {
        en: {
          title: "Review spending",
          body: "Recorded expenses are higher than recorded income this period. Check which categories grew before adding new costs.",
        },
        am: {
          title: "ወጪን ይመልከቱ",
          body: "በዚህ ጊዜ የተመዘገበ ወጪ ከተመዘገበ ገቢ ይበልጣል። አዲስ ወጪ ከመጨመርዎ በፊት የትኛው ምድብ እንደጨመረ ይመልከቱ።",
        },
        om: {
          title: "Baasii irra deebi'ii ilaali",
          body: "Yeroo kana baasiin galmaa'e galii galmaa'e ol aana. Baasii haaraa dabaluun dura ramaddiin kami akka guddate ilaali.",
        },
      })
    );
  }

  if (!dataSufficient) {
    actions.push(
      finding(language, "action-record-more", "info", {
        en: {
          title: "Keep recording",
          body: "Add the next sale or expense so Mizan can compare this period with the previous one.",
        },
        am: {
          title: "መመዝገብ ይቀጥሉ",
          body: "ይህን ጊዜ ከቀድሞው ለማነፃፀር የሚቀጥለውን ሽያጭ ወይም ወጪ ይመዝግቡ።",
        },
        om: {
          title: "Galmeessuu itti fufi",
          body: "Yeroo kana kan duraa wajjin wal bira qabuuf gurgurtaa ykn baasii itti aanu galmeessi.",
        },
      })
    );
  } else if (actions.length === 0) {
    actions.push(
      finding(language, "action-steady", "info", {
        en: {
          title: "Keep the records current",
          body: "Income, cash collected, and stock look steady from the saved records. Continue recording every sale and expense.",
        },
        am: {
          title: "መዝገቡን ወቅታዊ ያድርጉት",
          body: "ከተቀመጡት መዝገቦች ገቢ፣ የተሰበሰበ ገንዘብ እና ክምችት የተረጋጉ ይመስላሉ። እያንዳንዱን ሽያጭና ወጪ መመዝገብ ይቀጥሉ።",
        },
        om: {
          title: "Galmee ammeessaa taasisaa",
          body: "Galmee ol kaa'ame irraa galii, maallaqa walitti qabame fi kuufamni tasgabbaa'aa fakkaatu. Gurgurtaa fi baasii hunda galmeessuu itti fufaa.",
        },
      })
    );
  }

  return {
    currency: "ETB",
    range: summary.range,
    generatedAtEat: cashFlow.generatedAtEat,
    dataSufficient,
    overview,
    metrics: {
      income: summary.period.income,
      expense: summary.period.expense,
      netProfit: summary.period.netCashFlow,
      cashCollected: cashFlow.collectedIn,
      creditSales: cashFlow.creditSales,
      collections: cashFlow.collections,
      cashSpent: cashFlow.spent,
      netCashMovement: cashFlow.netCashMovement,
      outstanding: cashFlow.outstanding,
      inventoryCostValue: valuation.costValue,
    },
    positives,
    problems,
    actions,
    products: {
      best: sold[0] ? toProductRef(sold[0]) : null,
      slow: slow.slice(0, 5).map(toProductRef),
      lowStock: lowStockRefs.slice(0, 5).map(toProductRef),
      daysOfCover: coverWatch.slice(0, 5).map(toProductRef),
    },
  };
}

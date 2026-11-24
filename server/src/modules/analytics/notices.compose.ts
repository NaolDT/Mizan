import type {
  BusinessInsightsDto,
  BusinessNoticeKind,
  InsightSeverity,
  InventoryIntelligenceDto,
  LanguageCode,
} from "@mizan/shared";
import { noticePeriodKey } from "../inventory/intelligence.math.js";

export interface NoticeDraft {
  kind: BusinessNoticeKind;
  severity: InsightSeverity;
  entityType: "PRODUCT" | "CUSTOMER" | "NONE";
  entityId: string | null;
  periodKey: string;
  payload: Record<string, string | number | null>;
}

function money(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function composeNoticeDrafts(input: {
  eatDate: string;
  insights: BusinessInsightsDto;
  intelligence: InventoryIntelligenceDto;
}): NoticeDraft[] {
  const drafts: NoticeDraft[] = [];
  const push = (draft: Omit<NoticeDraft, "periodKey">) => {
    drafts.push({
      ...draft,
      periodKey: noticePeriodKey(input.eatDate, draft.kind, draft.entityId),
    });
  };

  for (const item of input.intelligence.reorderSoon.slice(0, 3)) {
    push({
      kind: "STOCK_COVER",
      severity: "warning",
      entityType: "PRODUCT",
      entityId: item.productId,
      payload: {
        name: item.name,
        days: item.daysOfCover,
        qty: item.suggestedReorderQty,
        unit: item.unit,
      },
    });
  }

  const lowWithoutCover = input.intelligence.items.filter(
    (row) =>
      row.lowStockThreshold > 0 &&
      row.quantityOnHand <= row.lowStockThreshold &&
      !row.shouldReorder
  );
  if (lowWithoutCover[0]) {
    push({
      kind: "LOW_STOCK",
      severity: "warning",
      entityType: "PRODUCT",
      entityId: lowWithoutCover[0].productId,
      payload: {
        count: lowWithoutCover.length,
        names: lowWithoutCover.slice(0, 3).map((row) => row.name).join(", "),
      },
    });
  }

  if (input.intelligence.deadStock[0]) {
    push({
      kind: "DEAD_STOCK",
      severity: "info",
      entityType: "PRODUCT",
      entityId: input.intelligence.deadStock[0].productId,
      payload: {
        count: input.intelligence.deadStock.length,
        names: input.intelligence.deadStock.slice(0, 3).map((row) => row.name).join(", "),
      },
    });
  } else if (input.intelligence.slowMoving[0]) {
    push({
      kind: "SLOW_MOVING",
      severity: "info",
      entityType: "PRODUCT",
      entityId: input.intelligence.slowMoving[0].productId,
      payload: {
        count: input.intelligence.slowMoving.length,
        names: input.intelligence.slowMoving.slice(0, 3).map((row) => row.name).join(", "),
      },
    });
  }

  if (input.intelligence.demandUp[0] && input.intelligence.demandUp[0].quantitySold > 0) {
    push({
      kind: "DEMAND_UP",
      severity: "info",
      entityType: "PRODUCT",
      entityId: input.intelligence.demandUp[0].productId,
      payload: {
        name: input.intelligence.demandUp[0].name,
        qty: input.intelligence.demandUp[0].quantitySold,
      },
    });
  }

  for (const item of input.insights.items) {
    if (item.id === "income-down") {
      push({
        kind: "INCOME_DOWN",
        severity: "warning",
        entityType: "NONE",
        entityId: null,
        payload: { body: item.body },
      });
    }
    if (item.id === "expenses-up") {
      push({
        kind: "EXPENSES_UP",
        severity: "warning",
        entityType: "NONE",
        entityId: null,
        payload: { body: item.body },
      });
    }
    if (item.id === "credit-outstanding") {
      push({
        kind: "OUTSTANDING",
        severity: "warning",
        entityType: "NONE",
        entityId: null,
        payload: {
          count: input.insights.customersOwingCount,
          amount: money(input.insights.outstandingTotal),
        },
      });
    }
    if (item.id === "need-more-activity") {
      push({
        kind: "NEED_RECORDS",
        severity: "info",
        entityType: "NONE",
        entityId: null,
        payload: {},
      });
    }
  }

  return drafts.slice(0, 10);
}

export function localizeNotice(
  language: LanguageCode,
  kind: BusinessNoticeKind,
  payload: Record<string, string | number | null>
): { title: string; body: string } {
  const fill = (template: string) =>
    Object.entries(payload).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, value == null ? "" : String(value)),
      template
    );

  const copies: Record<BusinessNoticeKind, Record<LanguageCode, { title: string; body: string }>> = {
    STOCK_COVER: {
      en: {
        title: "{name} may run out soon",
        body: "Based on recent sales, {name} may last about {days} days. Consider planning a reorder of about {qty} {unit}. This is an estimate, not a purchase.",
      },
      am: {
        title: "{name} ሊያልቅ ይችላል",
        body: "በቅርብ ሽያጭ {name} ወደ {days} ቀን ሊቆይ ይችላል። ወደ {qty} {unit} እንደገና መግዛት ያስቡ። ይህ ግምት ነው እንጂ ግዢ አይደለም።",
      },
      om: {
        title: "{name} dhumuu danda'a",
        body: "Gurgurtaa dhiyoo irratti {name} guyyaa {days} turuu danda'a. {qty} {unit} bittaa haarawa karoorfadhu. Tilmaama malee bittaa miti.",
      },
    },
    LOW_STOCK: {
      en: {
        title: "Low stock",
        body: "{count} product(s) are at or below the low-stock level: {names}.",
      },
      am: {
        title: "ዝቅተኛ ክምችት",
        body: "{count} እቃ በዝቅተኛ ክምችት ላይ ነው፦ {names}።",
      },
      om: {
        title: "Kuufama gadi aanaa",
        body: "Meeshaaleen {count} sadarkaa gadi aanaa irratti jiru: {names}.",
      },
    },
    DEAD_STOCK: {
      en: {
        title: "Stock that is not selling",
        body: "{count} product(s) have been sitting with no linked sales: {names}.",
      },
      am: {
        title: "ያልተሸጠ ክምችት",
        body: "{count} እቃ ተቀምጦ የተገናኘ ሽያጭ የለውም፦ {names}።",
      },
      om: {
        title: "Kuufama hin gurguramne",
        body: "Meeshaaleen {count} gurgurtaa hidhataa malee jiraatu: {names}.",
      },
    },
    SLOW_MOVING: {
      en: {
        title: "Slow-moving stock",
        body: "{count} product(s) had little or no sales this period: {names}.",
      },
      am: {
        title: "በዝግታ የሚሸጥ ክምችት",
        body: "{count} እቃ በዚህ ጊዜ ሽያጭ አልነበረውም ወይም በጣም ጥቂት ነበር፦ {names}።",
      },
      om: {
        title: "Kuufama suuta gurguramu",
        body: "Meeshaaleen {count} yeroo kana gurgurtaa xinnaa qabu: {names}.",
      },
    },
    INCOME_DOWN: {
      en: { title: "Income is down", body: "{body}" },
      am: { title: "ገቢ ቀንሷል", body: "{body}" },
      om: { title: "Galiin gadi bu'eera", body: "{body}" },
    },
    EXPENSES_UP: {
      en: { title: "Expenses increased", body: "{body}" },
      am: { title: "ወጪ ጨምሯል", body: "{body}" },
      om: { title: "Baasiin dabaleera", body: "{body}" },
    },
    OUTSTANDING: {
      en: {
        title: "Customer balances unpaid",
        body: "{count} customer(s) still owe {amount} ETB. Record a payment when they settle.",
      },
      am: {
        title: "ያልተከፈለ ዱቤ",
        body: "{count} ደንበኛ አሁንም {amount} ETB ይቀሩዎታል። ሲከፍሉ ክፍያ ይመዝግቡ።",
      },
      om: {
        title: "Liqaa hin kaffalamne",
        body: "Maamiltoota {count} ammas ETB {amount} si hafuu. Yeroo kaffalan kaffaltii galmeessi.",
      },
    },
    NEED_RECORDS: {
      en: {
        title: "Need more records",
        body: "Record a few more sales and expenses so Mizan can warn you about real changes.",
      },
      am: {
        title: "ተጨማሪ መዝገብ ያስፈልጋል",
        body: "እውነተኛ ለውጦችን ለማስጠንቀቅ ጥቂት ተጨማሪ ሽያጭና ወጪ ይመዝግቡ።",
      },
      om: {
        title: "Galmeen dabalataa barbaachisa",
        body: "Jijjiirama dhugaa akeekkachiisuuf gurgurtaa fi baasii muraasa galmeessi.",
      },
    },
    DEMAND_UP: {
      en: {
        title: "{name} is selling faster",
        body: "{name} sold {qty} this period compared with the previous one. Review remaining stock.",
      },
      am: {
        title: "{name} በፍጥነት እየተሸጠ ነው",
        body: "{name} በዚህ ጊዜ {qty} ተሽጧል። ከቀድሞው ጋር ሲነፃፀር ፍጥነቱ ጨምሯል። የቀረውን ክምችት ይመልከቱ።",
      },
      om: {
        title: "{name} saffisaan gurguramaa jira",
        body: "{name} yeroo kana {qty} gurgurameera. Kuufama hafaa ilaali.",
      },
    },
  };

  const entry = copies[kind][language] ?? copies[kind].en;
  return { title: fill(entry.title), body: fill(entry.body) };
}

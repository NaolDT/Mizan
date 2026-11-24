import type { Prisma } from "@prisma/client";
import type { BusinessNoticeDto, BusinessNoticeKind, InsightSeverity, LanguageCode } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { formatEatDateKey } from "../../utils/eatDate.js";
import { getInventoryIntelligence } from "../inventory/intelligence.service.js";
import { composeNoticeDrafts, localizeNotice } from "./notices.compose.js";
import { getBusinessInsights } from "./analytics.service.js";

const NOTICE_KINDS: BusinessNoticeKind[] = [
  "STOCK_COVER",
  "LOW_STOCK",
  "DEAD_STOCK",
  "SLOW_MOVING",
  "INCOME_DOWN",
  "EXPENSES_UP",
  "OUTSTANDING",
  "NEED_RECORDS",
  "DEMAND_UP",
];

function isNoticeKind(value: string): value is BusinessNoticeKind {
  return NOTICE_KINDS.includes(value as BusinessNoticeKind);
}

export async function listBusinessNotices(
  businessId: string,
  language: LanguageCode = "en",
  range: "today" | "week" | "month" = "week"
): Promise<BusinessNoticeDto[]> {
  const [insights, intelligence] = await Promise.all([
    getBusinessInsights(businessId, range, language),
    getInventoryIntelligence(businessId, range),
  ]);

  const drafts = composeNoticeDrafts({
    eatDate: formatEatDateKey(),
    insights,
    intelligence,
  });

  for (const draft of drafts) {
    const existing = await prisma.businessNotice.findUnique({
      where: { businessId_periodKey: { businessId, periodKey: draft.periodKey } },
    });
    if (existing?.dismissedAt) continue;
    if (existing) {
      await prisma.businessNotice.update({
        where: { id: existing.id },
        data: {
          payload: draft.payload as Prisma.InputJsonValue,
          severity: draft.severity,
        },
      });
      continue;
    }
    await prisma.businessNotice.create({
      data: {
        businessId,
        kind: draft.kind,
        severity: draft.severity,
        entityType: draft.entityType,
        entityId: draft.entityId,
        periodKey: draft.periodKey,
        payload: draft.payload as Prisma.InputJsonValue,
      },
    });
  }

  const rows = await prisma.businessNotice.findMany({
    where: { businessId, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return rows.flatMap((row) => {
    if (!isNoticeKind(row.kind)) return [];
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, string | number | null>)
        : {};
    const copy = localizeNotice(language, row.kind, payload);
    return [
      {
        id: row.id,
        kind: row.kind,
        severity: row.severity as InsightSeverity,
        entityType: (row.entityType as BusinessNoticeDto["entityType"]) || "NONE",
        entityId: row.entityId,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });
}

export async function dismissBusinessNotice(businessId: string, noticeId: string): Promise<void> {
  const existing = await prisma.businessNotice.findFirst({
    where: { id: noticeId, businessId },
  });
  if (!existing) throw new AppError(404, "NOTICE_NOT_FOUND", "Notice not found");
  if (existing.dismissedAt) return;
  await prisma.businessNotice.update({
    where: { id: existing.id },
    data: { dismissedAt: new Date() },
  });
}

import type { AuditEventDto } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";

export async function recordAudit(params: {
  businessId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      businessId: params.businessId,
      actorUserId: params.actorUserId,
      action: params.action.slice(0, 40),
      entityType: params.entityType.slice(0, 40),
      entityId: params.entityId ?? null,
      summary: params.summary.slice(0, 240),
    },
  });
}

export async function listAuditEvents(businessId: string): Promise<AuditEventDto[]> {
  const rows = await prisma.auditEvent.findMany({
    where: { businessId },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    actorName: row.actor.name,
    createdAt: row.createdAt.toISOString(),
  }));
}

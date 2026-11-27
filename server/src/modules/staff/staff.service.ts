import bcrypt from "bcryptjs";
import type {
  CreateStaffRequest,
  StaffMemberDto,
  UpdateStaffRequest,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { normalizeEthiopianPhone } from "../auth/auth.service.js";
import { recordAudit } from "./audit.service.js";

function mapStaff(row: {
  id: string;
  role: StaffMemberDto["role"];
  status: StaffMemberDto["status"];
  createdAt: Date;
  user: { id: string; name: string; phone: string | null; email: string | null };
}): StaffMemberDto {
  return {
    id: row.id,
    userId: row.user.id,
    name: row.user.name,
    phone: row.user.phone,
    email: row.user.email,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

async function activeOwnerCount(businessId: string): Promise<number> {
  return prisma.businessMembership.count({
    where: { businessId, role: "OWNER", status: "ACTIVE" },
  });
}

export async function listStaff(businessId: string): Promise<StaffMemberDto[]> {
  const rows = await prisma.businessMembership.findMany({
    where: { businessId },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapStaff);
}

export async function createStaff(
  businessId: string,
  actorUserId: string,
  input: CreateStaffRequest
): Promise<StaffMemberDto> {
  if (input.role === "OWNER") {
    throw new AppError(400, "INVALID_ROLE", "Add a manager or cashier instead of another owner");
  }
  const name = input.name.trim();
  if (name.length < 2) throw new AppError(400, "INVALID_NAME", "Name is too short");
  if (input.password.length < 6) {
    throw new AppError(400, "WEAK_PASSWORD", "Password must be at least 6 characters");
  }

  const email = input.email?.trim().toLowerCase() || null;
  const phone = normalizeEthiopianPhone(input.phone);
  if (!email && !phone) {
    throw new AppError(400, "IDENTIFIER_REQUIRED", "Give the teammate a phone number or email");
  }

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, "EMAIL_EXISTS", "That email already has a Mizan login");
  }
  if (phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw new AppError(409, "PHONE_EXISTS", "That phone already has a Mizan login");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      preferredLanguage: input.preferredLanguage ?? "am",
      role: "OWNER",
      memberships: {
        create: {
          businessId,
          role: input.role,
          status: "ACTIVE",
          invitedById: actorUserId,
        },
      },
    },
    include: {
      memberships: {
        where: { businessId },
        include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      },
    },
  });

  const membership = created.memberships[0];
  await recordAudit({
    businessId,
    actorUserId,
    action: "CREATE_STAFF",
    entityType: "MEMBERSHIP",
    entityId: membership.id,
    summary: `Added ${created.name} as ${input.role}`,
  });
  return mapStaff({ ...membership, user: created });
}

export async function updateStaff(
  businessId: string,
  actorUserId: string,
  membershipId: string,
  input: UpdateStaffRequest
): Promise<StaffMemberDto> {
  const existing = await prisma.businessMembership.findFirst({
    where: { id: membershipId, businessId },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!existing) throw new AppError(404, "STAFF_NOT_FOUND", "Team member not found");

  if (
    existing.role === "OWNER" &&
    ((input.role && input.role !== "OWNER") || input.status === "DISABLED")
  ) {
    const owners = await activeOwnerCount(businessId);
    if (owners <= 1) {
      throw new AppError(409, "LAST_OWNER", "Keep at least one owner on this shop");
    }
  }
  if (input.role === "OWNER") {
    throw new AppError(400, "INVALID_ROLE", "Do not promote staff to owner from this screen");
  }

  const updated = await prisma.businessMembership.update({
    where: { id: existing.id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
  });

  await recordAudit({
    businessId,
    actorUserId,
    action: input.status === "DISABLED" ? "DISABLE_STAFF" : "UPDATE_STAFF",
    entityType: "MEMBERSHIP",
    entityId: updated.id,
    summary: `${updated.user.name}: ${updated.role} (${updated.status})`,
  });
  return mapStaff(updated);
}

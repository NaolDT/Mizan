import bcrypt from "bcryptjs";
import { Prisma, type Business, type User } from "@prisma/client";
import type {
  AuthResponse,
  BusinessDto,
  LoginRequest,
  RegisterRequest,
  UserDto,
} from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { signAuthToken } from "../../middleware/auth.middleware.js";
import { AppError } from "../../utils/apiResponse.js";
import {
  generateUniqueReferralCode,
  normalizeReferralCode,
  resolveReferrerByCode,
} from "../rewards/rewards.service.js";

const DEMO_EMAIL = "demo@mizan.et";
const DEMO_PHONE = "+251911223344";

export function normalizeEthiopianPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s()-]/g, "").trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("09") && cleaned.length === 10) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("07") && cleaned.length === 10) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("251") && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export function mapUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    preferredLanguage: user.preferredLanguage,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function mapBusinessDto(business: Business): BusinessDto {
  return {
    id: business.id,
    ownerId: business.ownerId,
    name: business.name,
    category: business.category,
    location: business.location,
    currency: "ETB",
    preferredLanguage: business.preferredLanguage,
    plan: business.plan,
    loyaltyEnabled: business.loyaltyEnabled,
    loyaltyEtbPerPoint: Number(business.loyaltyEtbPerPoint.toFixed(2)),
    createdAt: business.createdAt.toISOString(),
  };
}

export async function registerMerchant(input: RegisterRequest): Promise<AuthResponse> {
  const email = input.email?.trim().toLowerCase() || null;
  const phone = normalizeEthiopianPhone(input.phone);

  if (!email && !phone) {
    throw new AppError(
      400,
      "IDENTIFIER_REQUIRED",
      "Please provide either a phone number or an email address"
    );
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError(409, "EMAIL_EXISTS", "An account with this email already exists");
    }
  }

  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new AppError(
        409,
        "PHONE_EXISTS",
        "An account with this phone number already exists"
      );
    }
  }

  // An invite code must belong to a real shop owner, otherwise the new owner
  // would silently lose the reward they were promised.
  const referralCodeInput = input.referralCode?.trim();
  let referrer: User | null = null;
  if (referralCodeInput) {
    referrer = await resolveReferrerByCode(referralCodeInput);
    if (!referrer) {
      throw new AppError(
        400,
        "INVALID_REFERRAL_CODE",
        "This invite code was not found. Check the code or leave it empty."
      );
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const { user, business } = await prisma.$transaction(async (tx) => {
    const ownReferralCode = await generateUniqueReferralCode(tx, input.name.trim());

    const createdUser = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        phone,
        passwordHash,
        preferredLanguage: input.preferredLanguage,
        role: "OWNER",
        referralCode: ownReferralCode,
      },
    });

    if (referrer) {
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: createdUser.id,
          codeUsed: referrer.referralCode ?? normalizeReferralCode(referralCodeInput ?? ""),
        },
      });
    }

    const createdBusiness = await tx.business.create({
      data: {
        ownerId: createdUser.id,
        name: input.businessName.trim(),
        category: input.businessCategory,
        location: input.location?.trim() || null,
        currency: "ETB",
        preferredLanguage: input.preferredLanguage,
        plan: "FREE",
      },
    });

    return { user: createdUser, business: createdBusiness };
  });

  const { grantWelcomePromotion } = await import("../billing/credit.service.js");
  await grantWelcomePromotion(business.id, user.id).catch((err) => {
    console.error("[Billing] welcome credits failed", err instanceof Error ? err.message : "unknown");
  });

  const token = signAuthToken({ sub: user.id, role: user.role });

  return {
    token,
    user: mapUserDto(user),
    business: mapBusinessDto(business),
  };
}

export async function loginMerchant(input: LoginRequest): Promise<AuthResponse> {
  const rawId = input.identifier.trim();
  const isEmail = rawId.includes("@");
  const normalizedPhone = !isEmail ? normalizeEthiopianPhone(rawId) : null;

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: rawId.toLowerCase() }
      : {
          OR: [
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            { phone: rawId },
          ],
        },
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid phone/email or password");
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid phone/email or password");
  }

  let business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: `${user.name}'s Business`,
        category: "RETAIL",
        currency: "ETB",
        preferredLanguage: user.preferredLanguage,
        plan: "FREE",
      },
    });
  }

  const token = signAuthToken({ sub: user.id, role: user.role });

  return {
    token,
    user: mapUserDto(user),
    business: mapBusinessDto(business),
  };
}

/**
 * Instant 1-Click Demo Merchant provisioner ("Merkato Mini-Mart").
 * Ensures judges/evaluators always have rich Ethiopian ETB ledger entries even
 * on a freshly migrated database where `npm run db:seed` wasn't run manually.
 */
export async function loginOrProvisionDemoMerchant(): Promise<AuthResponse> {
  let demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  if (!demoUser) {
    const passwordHash = await bcrypt.hash("MizanDemo2026!", 12);
    demoUser = await prisma.user.create({
      data: {
        name: "Abebe Kebede",
        email: DEMO_EMAIL,
        phone: DEMO_PHONE,
        passwordHash,
        preferredLanguage: "am",
        role: "OWNER",
      },
    });
  }

  let demoBusiness = await prisma.business.findFirst({
    where: { ownerId: demoUser.id },
    orderBy: { createdAt: "asc" },
  });

  if (!demoBusiness) {
    demoBusiness = await prisma.business.create({
      data: {
        ownerId: demoUser.id,
        name: "Merkato Mini-Mart (መርካቶ ሚኒ ማርት)",
        category: "GROCERY",
        location: "Merkato, Addis Ababa",
        currency: "ETB",
        preferredLanguage: "am",
        plan: "FREE",
      },
    });
  }

  const existingProductCount = await prisma.product.count({
    where: { businessId: demoBusiness.id },
  });
  if (existingProductCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          businessId: demoBusiness.id,
          name: "Sunflower Cooking Oil 1L",
          nameKey: "sunflower cooking oil 1l",
          brand: "Sunflower",
          sizeLabel: "1L",
          categoryLabel: "Food",
          barcode: "6291001012345",
          unit: "bottle",
          quantityOnHand: 24,
          lowStockThreshold: 5,
          sellingPrice: 180,
          costPrice: 150,
        },
        {
          businessId: demoBusiness.id,
          name: "Sugar 1kg",
          nameKey: "sugar 1kg",
          brand: null,
          sizeLabel: "1kg",
          categoryLabel: "Food",
          barcode: null,
          unit: "pack",
          quantityOnHand: 40,
          lowStockThreshold: 8,
          sellingPrice: 150,
          costPrice: 130,
        },
        {
          businessId: demoBusiness.id,
          name: "Laundry Soap",
          nameKey: "laundry soap",
          brand: null,
          sizeLabel: null,
          categoryLabel: "Household",
          barcode: null,
          unit: "bar",
          quantityOnHand: 50,
          lowStockThreshold: 10,
          sellingPrice: 45,
          costPrice: 30,
        },
      ],
    });
  }

  const existingTxCount = await prisma.transaction.count({
    where: { businessId: demoBusiness.id },
  });

  if (existingTxCount === 0) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const starterRows = [
      {
        key: "demo-auto-1",
        daysAgo: 0,
        type: "INCOME" as const,
        category: "SALES" as const,
        amount: "4200.00",
        description: "Morning teff flour, cooking oil & sugar retail sales",
        paymentMethod: "CASH" as const,
        source: "VOICE" as const,
        counterpartyName: null,
      },
      {
        key: "demo-auto-2",
        daysAgo: 0,
        type: "INCOME" as const,
        category: "SALES" as const,
        amount: "1850.00",
        description: "Coffee beans & household essentials via Telebirr",
        paymentMethod: "TELEBIRR" as const,
        source: "MANUAL" as const,
        counterpartyName: "Tigist T.",
      },
      {
        key: "demo-auto-3",
        daysAgo: 0,
        type: "EXPENSE" as const,
        category: "TRANSPORT" as const,
        amount: "650.00",
        description: "Minivan delivery from wholesale depot",
        paymentMethod: "CASH" as const,
        source: "VOICE" as const,
        counterpartyName: null,
      },
      {
        key: "demo-auto-4",
        daysAgo: 1,
        type: "INCOME" as const,
        category: "SALES" as const,
        amount: "6900.00",
        description: "Daily grocery & bottled water sales",
        paymentMethod: "CASH" as const,
        source: "VOICE" as const,
        counterpartyName: null,
      },
      {
        key: "demo-auto-5",
        daysAgo: 1,
        type: "EXPENSE" as const,
        category: "INVENTORY_PURCHASE" as const,
        amount: "3400.00",
        description: "Wholesale restock: 5L cooking oil cartons & pasta",
        paymentMethod: "BANK" as const,
        source: "CHAT" as const,
        counterpartyName: "Bole Wholesale PLC",
      },
      {
        key: "demo-auto-6",
        daysAgo: 2,
        type: "INCOME" as const,
        category: "SALES" as const,
        amount: "1200.00",
        description: "Credit grocery purchase (due Friday)",
        paymentMethod: "CREDIT" as const,
        source: "VOICE" as const,
        counterpartyName: "Dawit Bekele",
      },
      {
        key: "demo-auto-7",
        daysAgo: 3,
        type: "EXPENSE" as const,
        category: "RENT" as const,
        amount: "4500.00",
        description: "Shop stall rent allocation",
        paymentMethod: "BANK" as const,
        source: "MANUAL" as const,
        counterpartyName: null,
      },
      {
        key: "demo-auto-8",
        daysAgo: 4,
        type: "INCOME" as const,
        category: "SALES" as const,
        amount: "7600.00",
        description: "Weekend market rush sales",
        paymentMethod: "CASH" as const,
        source: "VOICE" as const,
        counterpartyName: null,
      },
    ];

    for (const row of starterRows) {
      await prisma.transaction.create({
        data: {
          businessId: demoBusiness.id,
          recordedById: demoUser.id,
          type: row.type,
          category: row.category,
          amount: new Prisma.Decimal(row.amount),
          currency: "ETB",
          description: row.description,
          paymentMethod: row.paymentMethod,
          counterpartyName: row.counterpartyName,
          transactionDate: new Date(now - row.daysAgo * dayMs),
          source: row.source,
          idempotencyKey: row.key,
          status: "COMPLETED",
        },
      });
    }
  }

  const token = signAuthToken({ sub: demoUser.id, role: demoUser.role });

  return {
    token,
    user: mapUserDto(demoUser),
    business: mapBusinessDto(demoBusiness),
  };
}

export async function getCurrentSessionProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User account not found");
  }

  const business = await prisma.business.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!business) {
    throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");
  }

  return {
    user: mapUserDto(user),
    business: mapBusinessDto(business),
  };
}

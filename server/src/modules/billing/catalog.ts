import { Prisma, type AiCreditFeature, type SubscriptionPlan } from "@prisma/client";
import { PLAN_CONFIG } from "../../config/plans.js";
import { prisma } from "../../config/prisma.js";

/**
 * Starting catalog. These match the prices already shipped in PLAN_CONFIG.
 * After the first insert, database rows are the source of truth so an admin
 * edit is not overwritten on the next boot.
 */
const PLAN_SEED: Record<
  SubscriptionPlan,
  { name: string; description: string; monthlyCredits: number; displayOrder: number }
> = {
  FREE: {
    name: "Free",
    description: "Shop records, inventory and a small monthly AI allowance.",
    monthlyCredits: 20,
    displayOrder: 0,
  },
  STARTER: {
    name: "Starter",
    description: "A monthly AI allowance for a shop that uses the assistant regularly.",
    monthlyCredits: 120,
    displayOrder: 1,
  },
  PRO: {
    name: "Pro",
    description: "More AI credits for voice, camera and everyday questions.",
    monthlyCredits: 350,
    displayOrder: 2,
  },
  BUSINESS: {
    name: "Business",
    description: "The largest monthly AI allowance. Best value per credit.",
    monthlyCredits: 900,
    displayOrder: 3,
  },
};

const PACKAGE_SEED = [
  {
    code: "topup_50",
    name: "Small top-up",
    description: "A small pack for occasional AI use. Credits last 90 days.",
    priceEtb: "50.00",
    credits: 40,
    bonusCredits: 0,
    validityDays: 90,
    displayOrder: 0,
  },
  {
    code: "topup_100",
    name: "Medium top-up",
    description: "For a busy week. Credits last 90 days.",
    priceEtb: "100.00",
    credits: 90,
    bonusCredits: 0,
    validityDays: 90,
    displayOrder: 1,
  },
  {
    code: "topup_250",
    name: "Large top-up",
    description: "For regular AI use without a monthly plan. Credits last 90 days.",
    priceEtb: "250.00",
    credits: 240,
    bonusCredits: 0,
    validityDays: 90,
    displayOrder: 2,
  },
  {
    code: "topup_500",
    name: "Business top-up",
    description: "The largest pack. A monthly plan is cheaper per credit.",
    priceEtb: "500.00",
    credits: 520,
    bonusCredits: 0,
    validityDays: 120,
    displayOrder: 3,
  },
] as const;

const PRICE_SEED: Record<AiCreditFeature, number> = {
  TEXT_CHAT: 1,
  VOICE_TURN: 2,
  TTS: 1,
  VISION: 2,
  RECEIPT: 3,
};

let ensured: Promise<void> | null = null;

export function ensureBillingCatalog(): Promise<void> {
  if (!ensured) {
    ensured = seedCatalog().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

async function seedCatalog(): Promise<void> {
  for (const plan of Object.keys(PLAN_SEED) as SubscriptionPlan[]) {
    const existing = await prisma.billingPlanConfig.findUnique({ where: { plan } });
    if (existing) continue;
    const seed = PLAN_SEED[plan];
    await prisma.billingPlanConfig.create({
      data: {
        plan,
        name: seed.name,
        description: seed.description,
        priceEtb: new Prisma.Decimal(PLAN_CONFIG[plan].priceEtb),
        monthlyCredits: seed.monthlyCredits,
        monthlyReplies: PLAN_CONFIG[plan].monthlyReplies,
        displayOrder: seed.displayOrder,
      },
    });
  }

  const packageCount = await prisma.topUpPackage.count();
  if (packageCount === 0) {
    await prisma.topUpPackage.createMany({
      data: PACKAGE_SEED.map((item) => ({
        ...item,
        priceEtb: new Prisma.Decimal(item.priceEtb),
      })),
    });
  }

  for (const feature of Object.keys(PRICE_SEED) as AiCreditFeature[]) {
    const existing = await prisma.aiCreditPrice.findUnique({ where: { feature } });
    if (!existing) {
      await prisma.aiCreditPrice.create({
        data: { feature, credits: PRICE_SEED[feature] },
      });
    }
  }

  await prisma.billingSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const welcome = await prisma.billingPromotion.findUnique({ where: { code: "welcome" } });
  if (!welcome) {
    await prisma.billingPromotion.create({
      data: {
        code: "welcome",
        kind: "WELCOME",
        name: "Welcome credits",
        credits: 10,
        validityDays: 30,
        active: false,
      },
    });
  }
}

export async function listActivePlans() {
  await ensureBillingCatalog();
  return prisma.billingPlanConfig.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

export async function getPlanConfig(plan: SubscriptionPlan) {
  await ensureBillingCatalog();
  const row = await prisma.billingPlanConfig.findUnique({ where: { plan } });
  if (!row) throw new Error(`Plan ${plan} is not configured`);
  return row;
}

export async function listActivePackages() {
  await ensureBillingCatalog();
  return prisma.topUpPackage.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

export async function creditPriceOf(feature: AiCreditFeature): Promise<number> {
  await ensureBillingCatalog();
  const row = await prisma.aiCreditPrice.findUnique({ where: { feature } });
  return row?.credits ?? 0;
}

export async function billingSettings() {
  await ensureBillingCatalog();
  const row = await prisma.billingSetting.findUnique({ where: { id: "default" } });
  if (!row) throw new Error("Billing settings are missing");
  return row;
}

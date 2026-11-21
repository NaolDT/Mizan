import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError, sendSuccess } from "../../utils/apiResponse.js";
import { ensureBillingCatalog } from "./catalog.js";
import { adminAdjustCredits } from "./credit.service.js";

export const billingAdminRouter = Router();

function requireBillingAdmin(req: { header: (name: string) => string | undefined }, _res: unknown, next: (err?: unknown) => void): void {
  const expected = env.BILLING_ADMIN_KEY.trim();
  const provided = req.header("x-mizan-admin-key")?.trim() ?? "";
  if (expected.length < 24) {
    next(new AppError(503, "BILLING_ADMIN_DISABLED", "Billing admin is not configured."));
    return;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    next(new AppError(401, "UNAUTHORIZED", "Admin key was rejected."));
    return;
  }
  next();
}

billingAdminRouter.use(requireBillingAdmin);

const planPatch = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(280).optional(),
  priceEtb: z.number().min(0).max(1_000_000).optional(),
  monthlyCredits: z.number().int().min(0).max(1_000_000).optional(),
  monthlyReplies: z.number().int().min(0).max(100_000).optional(),
  voiceEnabled: z.boolean().optional(),
  cameraEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  productLimit: z.number().int().positive().nullable().optional(),
  customerLimit: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(100).optional(),
});

const packageBody = z.object({
  code: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(280),
  priceEtb: z.number().positive().max(1_000_000),
  credits: z.number().int().positive().max(1_000_000),
  bonusCredits: z.number().int().min(0).max(1_000_000).default(0),
  validityDays: z.number().int().positive().max(3650),
  active: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(100).default(0),
});

billingAdminRouter.get("/overview", async (_req, res, next) => {
  try {
    await ensureBillingCatalog();
    const [payments, usage, outstanding] = await Promise.all([
      prisma.billingPayment.groupBy({
        by: ["purpose", "provider", "status"],
        _sum: { amount: true },
        _count: true,
      }),
      prisma.aiUsageRecord.groupBy({
        by: ["feature", "status"],
        _sum: { creditsCharged: true },
        _count: true,
      }),
      prisma.creditLot.aggregate({
        where: { remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        _sum: { remaining: true },
      }),
    ]);

    sendSuccess(res, {
      payments: payments.map((row) => ({
        purpose: row.purpose,
        provider: row.provider,
        status: row.status,
        count: row._count,
        amountEtb: row._sum.amount ? new Prisma.Decimal(row._sum.amount).toDecimalPlaces(2).toNumber() : 0,
      })),
      usage: usage.map((row) => ({
        feature: row.feature,
        status: row.status,
        count: row._count,
        credits: row._sum.creditsCharged ?? 0,
      })),
      creditsOutstanding: outstanding._sum.remaining ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.get("/plans", async (_req, res, next) => {
  try {
    await ensureBillingCatalog();
    sendSuccess(res, await prisma.billingPlanConfig.findMany({ orderBy: { displayOrder: "asc" } }));
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.patch("/plans/:plan", async (req, res, next) => {
  try {
    const plan = z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]).parse(req.params.plan);
    const body = planPatch.parse(req.body);
    const updated = await prisma.billingPlanConfig.update({
      where: { plan },
      data: {
        ...body,
        ...(body.priceEtb != null ? { priceEtb: new Prisma.Decimal(body.priceEtb.toFixed(2)) } : {}),
      },
    });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.get("/packages", async (_req, res, next) => {
  try {
    sendSuccess(res, await prisma.topUpPackage.findMany({ orderBy: { displayOrder: "asc" } }));
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.post("/packages", async (req, res, next) => {
  try {
    const body = packageBody.parse(req.body);
    const created = await prisma.topUpPackage.create({
      data: { ...body, priceEtb: new Prisma.Decimal(body.priceEtb.toFixed(2)) },
    });
    sendSuccess(res, created, 201);
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.patch("/packages/:code", async (req, res, next) => {
  try {
    const code = z.string().min(2).max(40).parse(req.params.code);
    const body = packageBody.partial().parse(req.body);
    const updated = await prisma.topUpPackage.update({
      where: { code },
      data: {
        ...body,
        ...(body.priceEtb != null ? { priceEtb: new Prisma.Decimal(body.priceEtb.toFixed(2)) } : {}),
      },
    });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.patch("/prices/:feature", async (req, res, next) => {
  try {
    const feature = z.enum(["TEXT_CHAT", "VOICE_TURN", "TTS", "VISION", "RECEIPT"]).parse(req.params.feature);
    const credits = z.object({ credits: z.number().int().min(0).max(100_000) }).parse(req.body).credits;
    const updated = await prisma.aiCreditPrice.update({ where: { feature }, data: { credits } });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.patch("/promotions/:code", async (req, res, next) => {
  try {
    const code = z.string().min(2).max(40).parse(req.params.code);
    const body = z
      .object({
        credits: z.number().int().min(0).max(1_000_000).optional(),
        validityDays: z.number().int().positive().max(3650).optional(),
        active: z.boolean().optional(),
        maxGrants: z.number().int().positive().nullable().optional(),
      })
      .parse(req.body);
    const updated = await prisma.billingPromotion.update({ where: { code }, data: body });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

billingAdminRouter.post("/credits", async (req, res, next) => {
  try {
    const body = z
      .object({
        businessId: z.string().uuid(),
        credits: z.number().int().positive(),
        direction: z.enum(["grant", "debit"]),
        note: z.string().min(3).max(240),
        idempotencyKey: z.string().min(4).max(60),
      })
      .parse(req.body);
    const business = await prisma.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business was not found.");
    const balance = await adminAdjustCredits(body);
    sendSuccess(res, { balance });
  } catch (err) {
    next(err);
  }
});

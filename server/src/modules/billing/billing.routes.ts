import { Router } from "express";
import type { Request } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { AppError, sendSuccess } from "../../utils/apiResponse.js";
import { getWallet, markNoticesRead } from "./credit.service.js";
import { listBusinessPayments, simulateDevPayment, startCheckout, verifyAndFulfill } from "./payment.service.js";
import { chapaSignatureOk, paymentReturnUrl } from "./payment.providers.js";
import { prisma } from "../../config/prisma.js";

export const billingRouter = Router();

const checkoutSchema = z.object({
  purpose: z.enum(["SUBSCRIPTION", "TOPUP"]),
  provider: z.enum(["CHAPA", "DEV"]),
  plan: z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]).optional(),
  packageCode: z.string().min(1).max(40).optional(),
});

const devSchema = z.object({
  txRef: z.string().min(4).max(64),
  outcome: z.enum(["success", "failed", "pending", "cancelled"]),
});

function txRefFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^mz[a-f0-9]{32}$/.test(trimmed) ? trimmed : null;
}

billingRouter.post("/payments/chapa/webhook", async (req, res, next) => {
  try {
    const signature = req.header("x-chapa-signature") || req.header("chapa-signature") || undefined;
    if (signature) {
      const raw = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!raw || !chapaSignatureOk(raw, signature)) {
        res.status(401).json({ success: false, error: { code: "BAD_SIGNATURE", message: "Invalid signature" } });
        return;
      }
    }

    const body = req.body as { tx_ref?: unknown; trx_ref?: unknown };
    const txRef = txRefFrom(body?.tx_ref) || txRefFrom(body?.trx_ref);
    if (!txRef) {
      res.status(200).json({ received: true });
      return;
    }
    await verifyAndFulfill(txRef);
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

billingRouter.get("/payments/chapa/callback", async (req, res, next) => {
  try {
    const txRef = txRefFrom(req.query.trx_ref) || txRefFrom(req.query.tx_ref);
    if (txRef) await verifyAndFulfill(txRef);
    res.redirect(302, paymentReturnUrl(txRef ?? ""));
  } catch (err) {
    next(err);
  }
});

billingRouter.use(requireAuth, requireTenant);

billingRouter.get("/wallet", async (req, res, next) => {
  try {
    sendSuccess(res, await getWallet(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/notices/read", async (req, res, next) => {
  try {
    await markNoticesRead(req.tenant!.businessId);
    sendSuccess(res, { read: true });
  } catch (err) {
    next(err);
  }
});

billingRouter.get("/payments", async (req, res, next) => {
  try {
    sendSuccess(res, await listBusinessPayments(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/checkout", async (req, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    sendSuccess(
      res,
      await startCheckout({
        businessId: req.tenant!.businessId,
        userId: req.tenant!.userId,
        purpose: body.purpose,
        provider: body.provider,
        plan: body.plan,
        packageCode: body.packageCode,
      })
    );
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/payments/:txRef/verify", async (req, res, next) => {
  try {
    const txRef = txRefFrom(req.params.txRef);
    if (!txRef) throw new AppError(400, "INVALID_REFERENCE", "Payment reference is not valid.");
    sendSuccess(res, await verifyAndFulfill(txRef, req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/payments/dev/simulate", async (req, res, next) => {
  try {
    const body = devSchema.parse(req.body);
    sendSuccess(res, await simulateDevPayment(req.tenant!.businessId, body.txRef, body.outcome));
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/subscription/cancel", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.tenant!.businessId } });
    if (!business) throw new AppError(404, "BUSINESS_NOT_FOUND", "Business profile not found");

    if (business.plan !== "FREE") {
      if (business.planPaidUntil && business.planPaidUntil.getTime() > Date.now()) {
        await prisma.business.update({
          where: { id: business.id },
          data: { cancelPlanAtPeriodEnd: true },
        });
      } else {
        await prisma.business.update({
          where: { id: business.id },
          data: { plan: "FREE", cancelPlanAtPeriodEnd: false, planPaidUntil: null },
        });
      }
    }
    sendSuccess(res, await getWallet(req.tenant!.businessId));
  } catch (err) {
    next(err);
  }
});

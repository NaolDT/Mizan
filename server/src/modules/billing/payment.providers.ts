import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type BillingPayment } from "@prisma/client";
import type { BillingProviderCode, PaymentProviderDto } from "@mizan/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/apiResponse.js";
import { amountsMatch, parseReportedAmount } from "./credit.policy.js";

export interface VerifiedPayment {
  status: "success" | "pending" | "failed" | "cancelled";
  amount: Prisma.Decimal;
  currency: string;
  txRef: string;
  providerRef: string | null;
}

export function chapaConfigured(): boolean {
  return env.CHAPA_SECRET_KEY.trim().length > 0;
}

export function devPaymentsAllowed(): boolean {
  return env.NODE_ENV !== "production";
}

export function configuredProviders(): PaymentProviderDto[] {
  const providers: PaymentProviderDto[] = [];
  if (chapaConfigured()) {
    providers.push({
      code: "CHAPA",
      name: "Chapa",
      description: "Pay securely with the methods Chapa supports.",
    });
  }
  if (devPaymentsAllowed()) {
    providers.push({
      code: "DEV",
      name: "Test payment",
      description: "Development only. No money moves.",
    });
  }
  return providers;
}

export function assertProvider(code: BillingProviderCode): void {
  if (code === "DEV" && !devPaymentsAllowed()) {
    throw new AppError(403, "DEV_PAYMENTS_DISABLED", "Test payments are not available in production.");
  }
  if (code === "CHAPA" && !chapaConfigured()) {
    throw new AppError(503, "CHAPA_NOT_CONFIGURED", "Chapa is not configured on this server.");
  }
}

function publicApiBase(): string {
  return env.PUBLIC_API_URL.trim().replace(/\/$/, "");
}

function clientBase(): string {
  return env.CLIENT_ORIGIN.split(",")[0]?.trim().replace(/\/$/, "") || "http://localhost:5173";
}

export function paymentReturnUrl(txRef: string): string {
  return `${clientBase()}/app?billing=return&txRef=${encodeURIComponent(txRef)}`;
}

export async function initiateProvider(
  payment: BillingPayment,
  customer: { email: string | null; name: string; phone: string | null }
): Promise<{ checkoutUrl: string }> {
  if (payment.provider === "DEV") {
    if (!devPaymentsAllowed()) {
      throw new AppError(403, "DEV_PAYMENTS_DISABLED", "Test payments are not available in production.");
    }
    return { checkoutUrl: `${clientBase()}/app?billing=dev&txRef=${encodeURIComponent(payment.txRef)}` };
  }

  const base = publicApiBase();
  if (!base) {
    throw new AppError(
      503,
      "PUBLIC_API_URL_REQUIRED",
      "Chapa needs PUBLIC_API_URL so the payment can be verified."
    );
  }

  const [firstName, ...rest] = customer.name.trim().split(/\s+/);
  const phone = customer.phone && /^0[79]\d{8}$/.test(customer.phone) ? customer.phone : undefined;
  const amount = new Prisma.Decimal(payment.amount).toFixed(2);

  let response: Response;
  try {
    response = await fetch(`${env.CHAPA_BASE_URL.replace(/\/$/, "")}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CHAPA_SECRET_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "ETB",
        email: customer.email ?? undefined,
        first_name: firstName || "Mizan",
        last_name: rest.join(" ") || "Customer",
        phone_number: phone,
        tx_ref: payment.txRef,
        callback_url: `${base}/api/v1/billing/payments/chapa/callback`,
        return_url: paymentReturnUrl(payment.txRef),
        customization: {
          title: "Mizan",
          description: payment.title.slice(0, 100),
        },
      }),
    });
  } catch (err) {
    console.error("[Chapa] initialize network error", err instanceof Error ? err.message : "unknown");
    throw new AppError(502, "PAYMENT_INIT_FAILED", "Payment could not be started. Try again in a moment.");
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: { checkout_url?: string };
    message?: string;
  } | null;
  const checkoutUrl = payload?.data?.checkout_url;
  if (!response.ok || !checkoutUrl) {
    console.error("[Chapa] initialize rejected", response.status);
    throw new AppError(502, "PAYMENT_INIT_FAILED", "Payment could not be started. Try again in a moment.");
  }
  return { checkoutUrl };
}

export async function verifyProvider(payment: BillingPayment): Promise<VerifiedPayment> {
  if (payment.provider === "DEV") {
    if (!devPaymentsAllowed()) {
      throw new AppError(403, "DEV_PAYMENTS_DISABLED", "Test payments are not available in production.");
    }
    const outcome = payment.devOutcome;
    const status =
      outcome === "success" || outcome === "failed" || outcome === "cancelled" || outcome === "pending"
        ? outcome
        : "pending";
    return {
      status,
      amount: new Prisma.Decimal(payment.amount),
      currency: payment.currency,
      txRef: payment.txRef,
      providerRef: "dev",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${env.CHAPA_BASE_URL.replace(/\/$/, "")}/transaction/verify/${encodeURIComponent(payment.txRef)}`,
      { headers: { Authorization: `Bearer ${env.CHAPA_SECRET_KEY.trim()}` } }
    );
  } catch (err) {
    console.error("[Chapa] verify network error", err instanceof Error ? err.message : "unknown");
    throw new AppError(502, "PAYMENT_VERIFY_FAILED", "Payment could not be verified yet. Try again in a moment.");
  }

  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    data?: {
      status?: string;
      amount?: unknown;
      currency?: string;
      tx_ref?: string;
      reference?: string;
    };
  } | null;

  if (response.status === 404 || !payload?.data) {
    return {
      status: "pending",
      amount: new Prisma.Decimal(0),
      currency: "",
      txRef: payment.txRef,
      providerRef: null,
    };
  }

  const data = payload.data;
  const reported = parseReportedAmount(data.amount) ?? new Prisma.Decimal(0);
  const raw = (data.status ?? "").toLowerCase();
  const status =
    raw === "success" ? "success" : raw === "failed" ? "failed" : raw === "cancelled" ? "cancelled" : "pending";

  if (status === "success") {
    const txMatches = data.tx_ref === payment.txRef;
    const currencyMatches = data.currency === payment.currency;
    const amountOk = amountsMatch(new Prisma.Decimal(payment.amount), reported);
    if (!txMatches || !currencyMatches || !amountOk) {
      return {
        status: "failed",
        amount: reported,
        currency: data.currency ?? "",
        txRef: data.tx_ref ?? "",
        providerRef: data.reference ?? null,
      };
    }
  }

  return {
    status,
    amount: reported,
    currency: data.currency ?? "",
    txRef: data.tx_ref ?? payment.txRef,
    providerRef: data.reference ?? null,
  };
}

/**
 * Chapa's webhook guide says to verify the transaction with the API.
 * When a signature header is present it must match HMAC-SHA256 of the raw
 * body using CHAPA_WEBHOOK_SECRET, or the secret key when no separate secret
 * is set. A bad signature is rejected. The body itself never grants credits.
 */
export function chapaSignatureOk(rawBody: Buffer, header: string | undefined): boolean {
  const secret = (env.CHAPA_WEBHOOK_SECRET || env.CHAPA_SECRET_KEY).trim();
  if (!secret || !header) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = Buffer.from(header.trim());
  const expected = Buffer.from(digest);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

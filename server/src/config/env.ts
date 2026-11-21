import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Both of these are published in the repository, so neither may sign production tokens.
const DEV_JWT_SECRET = "mizan-dev-jwt-secret-change-in-production-2026";
const PUBLIC_JWT_SECRETS = new Set([
  DEV_JWT_SECRET,
  "replace-with-at-least-32-random-characters-for-mizan-jwt",
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (provision a free Neon or Supabase PostgreSQL URL)"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters")
    .default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.5-flash-lite"),
  ADDIS_API_KEY: z.string().optional().default(""),
  ADDIS_BASE_URL: z.string().default("https://api.addisassistant.com/api/v1"),
  ADDIS_VOICE_AM: z.string().default("am-hamen"),
  ADDIS_VOICE_OM: z.string().default("om-bikila"),
  // Public base URL of this API, no trailing slash. Chapa calls it back here.
  PUBLIC_API_URL: z.string().optional().default(""),
  CHAPA_SECRET_KEY: z.string().optional().default(""),
  CHAPA_WEBHOOK_SECRET: z.string().optional().default(""),
  CHAPA_BASE_URL: z.string().default("https://api.chapa.co/v1"),
  // Platform billing admin API. Empty disables those routes. Never sent to the client.
  BILLING_ADMIN_KEY: z.string().optional().default(""),
});

const parsed = envSchema.safeParse({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/mizan_ai?schema=public",
});

if (!parsed.success) {
  console.error("Invalid server environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && PUBLIC_JWT_SECRETS.has(parsed.data.JWT_SECRET)) {
  console.error(
    "JWT_SECRET is missing or still set to a published example value. Set a private random value before starting in production."
  );
  process.exit(1);
}

// Real payment gateways are not connected yet. Until they are, plan changes and
// voice packs are applied by hand in development and blocked in production.
const manualBillingRaw = process.env.ALLOW_MANUAL_BILLING?.trim().toLowerCase();

export const env = {
  ...parsed.data,
  manualBillingEnabled: manualBillingRaw
    ? manualBillingRaw === "true"
    : parsed.data.NODE_ENV !== "production",
};

import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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
    .default("mizan-dev-jwt-secret-change-in-production-2026"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.5-flash-lite"),
  ADDIS_API_KEY: z.string().optional().default(""),
  ADDIS_BASE_URL: z.string().default("https://api.addisassistant.com/api/v1"),
  ADDIS_VOICE_AM: z.string().default("am-hamen"),
  ADDIS_VOICE_OM: z.string().default("om-bikila"),
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

// Real payment gateways are not connected yet. Until they are, plan changes and
// voice packs are applied by hand in development and blocked in production.
const manualBillingRaw = process.env.ALLOW_MANUAL_BILLING?.trim().toLowerCase();

export const env = {
  ...parsed.data,
  manualBillingEnabled: manualBillingRaw
    ? manualBillingRaw === "true"
    : parsed.data.NODE_ENV !== "production",
};

import { Router } from "express";
import { z } from "zod";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
} from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import {
  getCurrentSessionProfile,
  loginMerchant,
  loginOrProvisionDemoMerchant,
  registerMerchant,
} from "./auth.service.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(24).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  password: z.string().min(6).max(100),
  businessName: z.string().min(2).max(140),
  businessCategory: z.enum([
    "RETAIL",
    "GROCERY",
    "CAFE_RESTAURANT",
    "TRADER",
    "WHOLESALE",
    "SERVICE",
    "OTHER",
  ]),
  location: z.string().max(140).optional(),
  preferredLanguage: z.enum(["am", "om", "en"]).default("am"),
});

const loginSchema = z.object({
  identifier: z.string().min(3).max(160),
  password: z.string().min(1).max(100),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await registerMerchant({
      ...body,
      email: body.email || undefined,
    });
    setAuthCookie(res, result.token);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginMerchant(body);
    setAuthCookie(res, result.token);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/demo", async (_req, res, next) => {
  try {
    const result = await loginOrProvisionDemoMerchant();
    setAuthCookie(res, result.token);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  sendSuccess(res, { loggedOut: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await getCurrentSessionProfile(req.auth!.userId);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
});

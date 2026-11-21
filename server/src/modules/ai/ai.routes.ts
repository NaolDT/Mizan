import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { reserveAndRun } from "../billing/credit.service.js";
import {
  cancelProposedAction,
  confirmProposedAction,
  getOrCreateLatestConversation,
  processAssistantTurn,
} from "./ai.service.js";

export const aiRouter = Router();

aiRouter.use(requireAuth, requireTenant);

const chatBodySchema = z.object({
  message: z.string().min(1).max(2000),
  language: z.enum(["am", "om", "en"]).default("am"),
  conversationId: z.string().uuid().optional(),
  speakReply: z.boolean().optional().default(false),
  modality: z.enum(["TEXT", "VOICE", "IMAGE"]).optional().default("TEXT"),
});

const confirmBodySchema = z.object({
  idempotencyKey: z.string().min(4).max(80),
  overrides: z
    .object({
      type: z.enum(["INCOME", "EXPENSE"]).optional(),
      category: z
        .enum([
          "SALES",
          "SERVICE_INCOME",
          "OTHER_INCOME",
          "INVENTORY_PURCHASE",
          "TRANSPORT",
          "RENT",
          "UTILITIES",
          "SALARY",
          "FOOD",
          "MARKETING",
          "OTHER_EXPENSE",
        ])
        .optional(),
      amount: z.coerce.number().positive().max(100_000_000).optional(),
      description: z.string().min(1).max(240).optional(),
      paymentMethod: z.enum(["CASH", "TELEBIRR", "BANK", "CREDIT"]).optional(),
      counterpartyName: z.string().max(120).nullable().optional(),
      transactionDate: z.string().optional(),
    })
    .optional(),
});

aiRouter.get("/conversations/latest", async (req, res, next) => {
  try {
    const lang =
      req.query.language === "am" ||
      req.query.language === "om" ||
      req.query.language === "en"
        ? req.query.language
        : "am";
    const result = await getOrCreateLatestConversation(
      req.tenant!.businessId,
      req.tenant!.userId,
      lang
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/chat", async (req, res, next) => {
  try {
    const body = chatBodySchema.parse(req.body);
    const turn = await reserveAndRun({
      businessId: req.tenant!.businessId,
      userId: req.tenant!.userId,
      feature: "TEXT_CHAT",
      provider: "gemini",
      run: () =>
        processAssistantTurn({
          businessId: req.tenant!.businessId,
          userId: req.tenant!.userId,
          text: body.message,
          language: body.language,
          modality: body.modality,
          conversationId: body.conversationId,
          speakReply: body.speakReply,
        }),
    });
    sendSuccess(res, turn);
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/messages/:messageId/confirm", async (req, res, next) => {
  try {
    const body = confirmBodySchema.parse(req.body);
    const confirmed = await confirmProposedAction(
      req.tenant!.businessId,
      req.tenant!.userId,
      String(req.params.messageId),
      body
    );
    sendSuccess(res, confirmed);
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/messages/:messageId/cancel", async (req, res, next) => {
  try {
    const cancelled = await cancelProposedAction(
      req.tenant!.businessId,
      String(req.params.messageId)
    );
    sendSuccess(res, { message: cancelled });
  } catch (err) {
    next(err);
  }
});

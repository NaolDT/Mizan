import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { LanguageCode, TtsResponse, VoiceTurnResponse } from "@mizan/shared";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { requireTenant } from "../../middleware/tenant.middleware.js";
import { AppError, sendSuccess } from "../../utils/apiResponse.js";
import { processAssistantTurn } from "../ai/ai.service.js";
import { reserveAndRun } from "../billing/credit.service.js";
import { synthesizeMeteredSpeech } from "./voice.metered.js";
import { transcribeSpeechBuffer } from "./voice.service.js";

export const voiceRouter = Router();

voiceRouter.use(
  requireAuth,
  requireTenant,
  requirePermission("sell", "record_expense", "manage_inventory", "manage_customers")
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5MB limit per AGENTS.md
  },
});

const interactFieldsSchema = z.object({
  language: z.enum(["am", "om", "en"]).default("am"),
  conversationId: z.string().uuid().optional().or(z.literal("")),
  clientTranscriptFallback: z.string().max(2000).optional(),
});

const ttsBodySchema = z.object({
  text: z.string().min(1).max(1500),
  language: z.enum(["am", "om", "en"]).default("am"),
});

voiceRouter.post("/interact", upload.single("audio"), async (req, res, next) => {
  try {
    const startedAt = Date.now();
    const fields = interactFieldsSchema.parse(req.body);
    const language: LanguageCode = fields.language;

    let transcript = "";
    let sttProvider = "none";

    if (req.file && req.file.buffer.length > 0) {
      const stt = await transcribeSpeechBuffer(
        req.file.buffer,
        req.file.mimetype || "audio/webm",
        language
      );
      transcript = stt.transcript;
      sttProvider = stt.provider;
    }

    if (!transcript && fields.clientTranscriptFallback?.trim()) {
      transcript = fields.clientTranscriptFallback.trim();
      sttProvider = "browser-speech-fallback";
    }

    if (!transcript) {
      throw new AppError(
        422,
        "SPEECH_NOT_RECOGNIZED",
        language === "am"
          ? "ድምፁን መለየት አልተቻለም። እባክዎ ደግመው ይናገሩ ወይም በጽሑፍ ያስገቡ (ወይም የAPI ቁልፎችን ያረጋግጡ)።"
          : language === "om"
            ? "Sagaleen hin dhaga'amne. Maaloo irra deebi'aa dubbadhaa ykn barreeffamaan galchaa."
            : "Could not transcribe speech. Please speak clearly and try again, or type your request."
      );
    }

    const aiTurn = await reserveAndRun({
      businessId: req.tenant!.businessId,
      userId: req.tenant!.userId,
      feature: "VOICE_TURN",
      provider: "gemini",
      run: () =>
        processAssistantTurn({
          businessId: req.tenant!.businessId,
          userId: req.tenant!.userId,
          text: transcript,
          rawTranscript: transcript,
          language,
          modality: "VOICE",
          conversationId: fields.conversationId || undefined,
          speakReply: false,
        }),
    });

    const response: VoiceTurnResponse = {
      ...aiTurn,
      sttProvider,
      latencyMs: Date.now() - startedAt,
    };

    sendSuccess(res, response);
  } catch (err) {
    next(err);
  }
});

voiceRouter.post("/transcribe", upload.single("audio"), async (req, res, next) => {
  try {
    const fields = interactFieldsSchema.parse(req.body);
    const language: LanguageCode = fields.language;

    if (!req.file || req.file.buffer.length === 0) {
      throw new AppError(400, "AUDIO_REQUIRED", "An audio recording is required");
    }

    const stt = await transcribeSpeechBuffer(
      req.file.buffer,
      req.file.mimetype || "audio/webm",
      language
    );

    const transcript = stt.transcript.trim() || fields.clientTranscriptFallback?.trim() || "";
    if (!transcript) {
      throw new AppError(
        422,
        "SPEECH_NOT_RECOGNIZED",
        language === "am"
          ? "ድምፁን መለየት አልተቻለም። እባክዎ ደግመው ይናገሩ ወይም በጽሑፍ ያስገቡ።"
          : language === "om"
            ? "Sagaleen hin dhaga'amne. Maaloo irra deebi'aa dubbadhaa."
            : "Could not transcribe speech. Please try again."
      );
    }

    sendSuccess(res, {
      transcript,
      provider: stt.transcript.trim() ? stt.provider : "browser-speech-fallback",
    });
  } catch (err) {
    next(err);
  }
});

voiceRouter.post("/tts", async (req, res, next) => {
  try {
    const body = ttsBodySchema.parse(req.body);
    const tts: TtsResponse = await synthesizeMeteredSpeech(
      req.tenant!.businessId,
      body.text,
      body.language
    );
    sendSuccess(res, tts);
  } catch (err) {
    next(err);
  }
});

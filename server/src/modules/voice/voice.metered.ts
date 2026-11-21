import type { LanguageCode, VoiceQuotaDto } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { reserveAndRun } from "../billing/credit.service.js";
import {
  getVoiceQuota,
  refundVoiceReply,
  reserveVoiceReply,
} from "../subscription/subscription.service.js";
import { synthesizeSpeech, type TtsResult } from "./voice.service.js";

export interface MeteredTtsResult extends TtsResult {
  quotaExceeded: boolean;
  quota: VoiceQuotaDto;
}

/**
 * Every spoken reply goes through here so the monthly allowance cannot be
 * bypassed. A reply is reserved first and given back if no audio was produced,
 * so a provider outage never costs the shop a reply.
 */
export async function synthesizeMeteredSpeech(
  businessId: string,
  text: string,
  language: LanguageCode
): Promise<MeteredTtsResult> {
  const owner = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true },
  });
  return reserveAndRun({
    businessId,
    userId: owner?.ownerId ?? businessId,
    feature: "TTS",
    provider: "addis",
    accept: (result) => Boolean(result.audioBase64),
    run: () => synthesizeWithinReplyAllowance(businessId, text, language),
  });
}

async function synthesizeWithinReplyAllowance(
  businessId: string,
  text: string,
  language: LanguageCode
): Promise<MeteredTtsResult> {
  const reservation = await reserveVoiceReply(businessId);

  if (!reservation.source) {
    return {
      audioBase64: null,
      audioMimeType: null,
      provider: null,
      quotaExceeded: true,
      quota: reservation.quota,
    };
  }

  let tts: TtsResult;
  try {
    tts = await synthesizeSpeech(text, language);
  } catch (err) {
    await refundVoiceReply(businessId, reservation.source);
    throw err;
  }

  if (!tts.audioBase64) {
    await refundVoiceReply(businessId, reservation.source);
  }

  return {
    ...tts,
    quotaExceeded: false,
    quota: await getVoiceQuota(businessId),
  };
}

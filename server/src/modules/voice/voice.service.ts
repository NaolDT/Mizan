import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { LanguageCode } from "@mizan/shared";
import { env } from "../../config/env.js";
import { normalizeSpokenText } from "../../utils/spokenText.js";

export interface SttResult {
  transcript: string;
  provider: string;
}

export interface TtsResult {
  audioBase64: string | null;
  audioMimeType: string | null;
  provider: string | null;
}

/**
 * Primary STT: Addis Scribe API (supports `am`, `om` Turbo, and `en`).
 * Fallback STT: Google Gemini 3.8 Flash / 3.5 Flash-Lite inline audio transcription.
 */
export async function transcribeSpeechBuffer(
  audioBuffer: Buffer,
  mimeType: string,
  language: LanguageCode
): Promise<SttResult> {
  // Tier 1: Addis Scribe API
  if (env.ADDIS_API_KEY) {
    try {
      const requestId = `mizan-stt-${crypto.randomUUID()}`;
      const url = new URL(`${env.ADDIS_BASE_URL}/scribe/transcribe`);
      url.searchParams.set("backend", "turbo");
      url.searchParams.set("request_id", requestId);
      if (language !== "am") {
        url.searchParams.set("language", language);
      }

      const ext = mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("wav")
          ? "wav"
          : "webm";

      const form = new FormData();
      const uint8 = new Uint8Array(audioBuffer);
      form.append("audio", new Blob([uint8], { type: mimeType || "audio/webm" }), `utterance.${ext}`);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "x-api-key": env.ADDIS_API_KEY,
        },
        body: form,
        signal: AbortSignal.timeout(20_000),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          text?: string;
          data?: { text?: string };
        };
        const transcript = (json?.data?.text ?? json?.text ?? "").trim();
        if (transcript) {
          return {
            transcript,
            provider: `addis-scribe-${language}`,
          };
        }
      } else {
        console.warn(`[Addis Scribe STT] HTTP ${res.status} — failing over to Gemini audio`);
      }
    } catch (err) {
      console.warn("[Addis Scribe STT] Error — failing over to Gemini audio:", err);
    }
  }

  // Tier 2: Gemini Multimodal Audio Transcription (supports Amharic Ge'ez, Afaan Oromo Qubee & English)
  if (env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const langHint =
      language === "am"
        ? "Amharic (write strictly in Ethiopic Ge'ez script, keep monetary numbers accurate)"
        : language === "om"
          ? "Afaan Oromo (write strictly in Qubee Latin script, keep monetary numbers accurate)"
          : "English";

    const modelsToTry = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL];
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: audioBuffer.toString("base64"),
                    mimeType: mimeType || "audio/webm",
                  },
                },
                {
                  text: `Transcribe the spoken audio verbatim in ${langHint}. Return ONLY the transcribed text with no commentary or quotes.`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
          },
        });

        const transcript = (response.text ?? "").trim();
        if (transcript) {
          return {
            transcript,
            provider: `gemini-audio-${modelName}`,
          };
        }
      } catch (err) {
        console.warn(`[Gemini Audio STT (${modelName})] Error:`, err);
      }
    }
  }

  return {
    transcript: "",
    provider: "unconfigured",
  };
}

/**
 * Primary TTS (`am` & `om`): Addis Voices 2 (`am-hamen` / `om-bikila`).
 * Fallback TTS (`am` & `en`): Gemini 3.8 Flash-Lite TTS, then graceful client fallback (`null`).
 */
export async function synthesizeSpeech(
  rawSpokenText: string,
  language: LanguageCode
): Promise<TtsResult> {
  const preparedText = normalizeSpokenText(rawSpokenText, language);
  if (!preparedText) {
    return { audioBase64: null, audioMimeType: null, provider: null };
  }

  // Tier 1: Addis Voices 2 for Amharic & Afaan Oromo
  if (env.ADDIS_API_KEY && (language === "am" || language === "om")) {
    try {
      const voiceId = language === "om" ? env.ADDIS_VOICE_OM : env.ADDIS_VOICE_AM;
      const genRes = await fetch(`${env.ADDIS_BASE_URL}/voice/generations`, {
        method: "POST",
        headers: {
          "x-api-key": env.ADDIS_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: preparedText,
          voice_id: voiceId,
          language,
          output_format: "mp3_44100",
          client_request_id: crypto.randomUUID(),
        }),
        signal: AbortSignal.timeout(18_000),
      });

      if (genRes.ok) {
        const genJson = (await genRes.json()) as {
          audio_url?: string;
          audio?: string;
          data?: {
            audio_url?: string;
            audio_data_url?: string;
            audio?: string;
          };
        };

        const inlineDataUrl = genJson?.data?.audio_data_url ?? genJson?.data?.audio ?? genJson?.audio;
        if (inlineDataUrl && inlineDataUrl.startsWith("data:audio")) {
          const commaIdx = inlineDataUrl.indexOf(",");
          const meta = inlineDataUrl.slice(5, commaIdx);
          const mime = meta.split(";")[0] || "audio/mpeg";
          return {
            audioBase64: inlineDataUrl.slice(commaIdx + 1),
            audioMimeType: mime,
            provider: `addis-voices2-${voiceId}`,
          };
        }

        const signedUrl = genJson?.data?.audio_url ?? genJson?.audio_url;
        if (signedUrl) {
          const audioResp = await fetch(signedUrl, {
            signal: AbortSignal.timeout(12_000),
          });
          if (audioResp.ok) {
            const arrayBuf = await audioResp.arrayBuffer();
            return {
              audioBase64: Buffer.from(arrayBuf).toString("base64"),
              audioMimeType: "audio/mpeg",
              provider: `addis-voices2-${voiceId}`,
            };
          }
        }
      } else {
        console.warn(`[Addis Voices 2 TTS] HTTP ${genRes.status}`);
      }
    } catch (err) {
      console.warn("[Addis Voices 2 TTS] Error — falling back:", err);
    }
  }

  // Tier 2: Gemini 3.8 Flash-Lite TTS (officially supports Amharic & English on Free Tier)
  if (env.GEMINI_API_KEY && (language === "am" || language === "en")) {
    try {
      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: preparedText,
        config: {
          responseModalities: ["AUDIO"],
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data
      );
      if (part?.inlineData?.data) {
        return {
          audioBase64: part.inlineData.data,
          audioMimeType: part.inlineData.mimeType || "audio/wav",
          provider: "gemini-3.8-flash-lite-tts",
        };
      }
    } catch (err) {
      console.warn("[Gemini TTS Fallback] Error:", err);
    }
  }

  // Tier 3: Return null cleanly so UI still shows confirmation/reply & optional browser speechSynthesis
  return {
    audioBase64: null,
    audioMimeType: null,
    provider: null,
  };
}

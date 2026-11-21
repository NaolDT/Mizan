import type { LanguageCode } from "@mizan/shared";

let activeAudio: HTMLAudioElement | null = null;

export function stopActiveAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playAssistantVoice(params: {
  audioBase64: string | null;
  audioMimeType: string | null;
  fallbackText?: string | null;
  language: LanguageCode;
}): Promise<void> {
  stopActiveAudio();

  if (params.audioBase64) {
    const mime = params.audioMimeType || "audio/mpeg";
    const audio = new Audio(`data:${mime};base64,${params.audioBase64}`);
    activeAudio = audio;
    try {
      await audio.play();
      return;
    } catch (err) {
      console.warn("Autoplay or audio playback blocked:", err);
    }
  }

  // Browser Web Speech synthesis fallback (primarily useful for English when cloud TTS is unset)
  if (
    params.fallbackText &&
    params.language === "en" &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    const utterance = new SpeechSynthesisUtterance(params.fallbackText);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
}

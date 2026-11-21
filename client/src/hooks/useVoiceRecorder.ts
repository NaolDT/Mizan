import { useCallback, useEffect, useRef, useState } from "react";
import type { LanguageCode } from "@mizan/shared";

interface BrowserSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface RecordedVoicePayload {
  blob: Blob;
  mimeType: string;
  clientTranscriptFallback: string;
  durationSec: number;
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

export function useVoiceRecorder(language: LanguageCode) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const speechRecRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const browserTranscriptRef = useRef<string>("");
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const cleanupResources = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupResources();
  }, [cleanupResources]);

  const startRecording = useCallback(async () => {
    setMicError(null);
    browserTranscriptRef.current = "";
    setLiveTranscript("");
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone capture is not supported in this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 32_000,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      // Optional parallel Chrome Web Speech API transcript fallback (`am-ET` & `en-US`)
      const Win = window as unknown as {
        SpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognitionInstance;
      };
      const SpeechRecCtor = Win.SpeechRecognition || Win.webkitSpeechRecognition;
      if (SpeechRecCtor && (language === "am" || language === "en")) {
        try {
          const rec = new SpeechRecCtor();
          rec.lang = language === "am" ? "am-ET" : "en-US";
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event) => {
            let combined = "";
            for (let i = 0; i < event.results.length; i++) {
              combined += `${event.results[i][0]?.transcript ?? ""} `;
            }
            const text = combined.trim();
            browserTranscriptRef.current = text;
            setLiveTranscript(text);
          };
          rec.onerror = () => {
            // Non-blocking fallback
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // Ignore browser speech errors
        }
      }

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedSec(0);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSec(sec);
      }, 500);

      return true;
    } catch {
      cleanupResources();
      setMicError(
        language === "am"
          ? "የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ የአሳሽዎን የማይክሮፎን ፈቃድ ይፍቀዱ።"
          : language === "om"
            ? "Hayyamni maayikiroofoonii hin kennamne. Maaloo hayyama kennaa."
            : "Microphone permission denied. Please allow microphone access in your browser."
      );
      return false;
    }
  }, [cleanupResources, language]);

  const stopRecording = useCallback((): Promise<RecordedVoicePayload | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanupResources();
        setIsRecording(false);
        resolve(null);
        return;
      }

      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
      const activeMime = recorder.mimeType || "audio/webm";

      recorder.onstop = () => {
        const fallbackText = browserTranscriptRef.current;
        const blob = new Blob(chunksRef.current, { type: activeMime });
        cleanupResources();
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setLiveTranscript("");
        resolve({
          blob,
          mimeType: activeMime,
          clientTranscriptFallback: fallbackText,
          durationSec,
        });
      };

      recorder.stop();
    });
  }, [cleanupResources]);

  return {
    isRecording,
    elapsedSec,
    liveTranscript,
    micError,
    startRecording,
    stopRecording,
  };
}

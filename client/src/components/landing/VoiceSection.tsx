import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Loader2, Mic, RotateCcw } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import {
  CONTAINER,
  IllustrativeBadge,
  PrimaryButton,
  SectionHeading,
  useLandingActions,
  useLandingCopy,
} from "./shared";

type Phase = "idle" | "listening" | "understanding" | "confirm" | "recorded";

// Fixed bar heights so the waveform looks natural without random re-renders.
const WAVE_BARS = [30, 55, 40, 75, 50, 90, 60, 35, 80, 45, 95, 55, 70, 40, 85, 50, 65, 35, 75, 45, 60, 30, 70, 40];

function Waveform({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-12 items-center justify-center gap-[3px]">
      {WAVE_BARS.map((height, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full ${active ? "mizan-wave-bar bg-emerald-500" : "bg-slate-300"}`}
          style={{
            height: active ? `${height}%` : "12%",
            animationDelay: active ? `${index * 55}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A scripted walkthrough of one voice entry. It never touches the microphone or
 * the server, and the page says so, so it cannot be mistaken for the live system.
 */
function VoiceDemo() {
  const copy = useLandingCopy();
  const v = copy.voice;
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const start = () => {
    clearTimers();
    setPhase("listening");
    timers.current.push(
      window.setTimeout(() => setPhase("understanding"), 2600),
      window.setTimeout(() => setPhase("confirm"), 4000)
    );
  };

  const statusText =
    phase === "listening"
      ? v.listening
      : phase === "understanding"
        ? v.understanding
        : phase === "confirm"
          ? v.ready
          : phase === "recorded"
            ? v.recorded
            : v.tap;

  const micBusy = phase === "listening" || phase === "understanding" || phase === "confirm";
  const showTranscript = phase !== "idle" && phase !== "listening";

  return (
    <div className="w-full min-w-0 rounded-2xl bg-white p-5 text-slate-900 shadow-sm sm:p-6">
      <div className="mb-4 flex justify-end">
        <IllustrativeBadge label={copy.common.illustrative} />
      </div>

      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={start}
          disabled={micBusy}
          aria-label={v.micLabel}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
            phase === "listening" ? "bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"
          } disabled:cursor-default`}
        >
          {phase === "understanding" ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
          ) : phase === "recorded" ? (
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Mic className="h-7 w-7" aria-hidden="true" />
          )}
        </button>
        <p role="status" aria-live="polite" className="mt-3 text-center text-sm font-semibold text-slate-700">
          {statusText}
        </p>
        <div className="mt-2 w-full max-w-xs">
          <Waveform active={phase === "listening"} />
        </div>
      </div>

      <div className="mt-3 min-h-[5.5rem] space-y-3">
        {showTranscript && (
          <div className="ml-auto flex max-w-[95%] items-start gap-2 rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm text-white">
            <Mic className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="break-words font-medium">{v.utterance}</p>
          </div>
        )}

        {(phase === "confirm" || phase === "recorded") && (
          <div
            className={`rounded-xl border p-3.5 ${
              phase === "recorded" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <p
              className={`flex items-center gap-1.5 text-sm font-bold ${
                phase === "recorded" ? "text-emerald-800" : "text-slate-800"
              }`}
            >
              {phase === "recorded" && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {phase === "recorded" ? v.recorded : v.ready}
            </p>
            <dl className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
              <div className="min-w-0">
                <dt className="text-slate-600">{v.amount}</dt>
                <dd className="mt-0.5 font-bold text-emerald-700">1,200 ETB</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-slate-600">{v.category}</dt>
                <dd className="mt-0.5 truncate font-bold text-slate-900">{v.categoryValue}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-slate-600">{v.date}</dt>
                <dd className="mt-0.5 truncate font-bold text-slate-900">{v.dateValue}</dd>
              </div>
            </dl>
            {phase === "confirm" ? (
              <button
                type="button"
                onClick={() => setPhase("recorded")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {v.confirm}
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 underline underline-offset-4"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {v.again}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function VoiceSection() {
  const copy = useLandingCopy();
  const { t } = useLanguage();
  const { openDemo, demoLoading, demoError } = useLandingActions();

  return (
    <section
      id="voice"
      aria-labelledby="voice-title"
      className="bg-emerald-950 py-14 text-white sm:py-20"
    >
      <div className={`${CONTAINER} grid items-center gap-10 lg:grid-cols-2 lg:gap-14`}>
        <div className="min-w-0">
          <SectionHeading
            id="voice-title"
            title={copy.voice.title}
            subtitle={copy.voice.body}
            align="left"
            tone="dark"
          />
          <ul className="mt-6 space-y-3">
            {copy.voice.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-emerald-50">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-lg text-xs leading-relaxed text-emerald-200">{copy.voice.demoNote}</p>

          <div className="mt-5">
            <PrimaryButton tone="white" onClick={() => void openDemo()} disabled={demoLoading}>
              {demoLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>{demoLoading ? copy.common.demoStarting : t.openDemoShop}</span>
            </PrimaryButton>
            {demoError && (
              <p role="alert" className="mt-3 text-xs text-rose-200">
                {copy.common.demoError}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <VoiceDemo />
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  Loader2,
  Mic,
  Pencil,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type {
  AiMessageDto,
  AiTurnResponse,
  ConfirmActionResponse,
  ConversationDto,
  LanguageCode,
  PaymentMethod,
  ProposedActionDraft,
  ProposedCustomerPaymentDraft,
  ProposedStockDraft,
  ProposedTransactionDraft,
  TransactionCategory,
  TtsResponse,
} from "@mizan/shared";
import { CreditGate } from "./CreditGate";
import { SHOP_TEXT } from "../i18n/shopText";
import { useLanguage } from "../context/LanguageContext";
import {
  REWARDS_KEY,
  SUBSCRIPTION_KEY,
  useSubscription,
} from "../hooks/useBilling";
import { WALLET_KEY } from "../hooks/useWallet";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { fill, REWARDS_TEXT } from "../i18n/rewardsText";
import { LANGUAGE_LABELS } from "../i18n/translations";
import { apiRequest, apiUpload, isInsufficientCredits } from "../lib/api";
import { playAssistantVoice, stopActiveAudio } from "../lib/audioPlayer";
import { formatEtb } from "../lib/format";

const ALL_CATEGORIES: TransactionCategory[] = [
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
];

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "TELEBIRR", "BANK", "CREDIT"];

function isStockDraft(draft: ProposedActionDraft): draft is ProposedStockDraft {
  return draft.kind === "STOCK";
}
function isPaymentDraft(draft: ProposedActionDraft): draft is ProposedCustomerPaymentDraft {
  return draft.kind === "CUSTOMER_PAYMENT";
}
function isTxDraft(draft: ProposedActionDraft): draft is ProposedTransactionDraft {
  return !isStockDraft(draft) && !isPaymentDraft(draft);
}

interface PendingActionCardProps {
  message: AiMessageDto;
  onConfirmed: () => void;
}

function PendingActionCard({ message, onConfirmed }: PendingActionCardProps) {
  const { t, language } = useLanguage();
  const shop = SHOP_TEXT[language];
  const queryClient = useQueryClient();
  const draft = message.proposedAction;
  const txDraft = draft && isTxDraft(draft) ? draft : null;

  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(String(txDraft?.amount ?? ""));
  const [category, setCategory] = useState<TransactionCategory>(
    txDraft?.category ?? "SALES"
  );
  const [description, setDescription] = useState(txDraft?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    txDraft?.paymentMethod ?? "CASH"
  );
  const [counterpartyName, setCounterpartyName] = useState(
    txDraft?.counterpartyName ?? ""
  );

  const confirmMutation = useMutation({
    mutationFn: () => {
      const overrides: Partial<Omit<ProposedTransactionDraft, "currency" | "kind">> =
        isEditing && txDraft
          ? {
              amount: Number(amount),
              category,
              description: description.trim() || txDraft.description,
              paymentMethod,
              counterpartyName: counterpartyName.trim() || null,
            }
          : {};

      return apiRequest<ConfirmActionResponse>(
        `/ai/messages/${message.id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: `confirm-${message.id}`,
            overrides,
          }),
        }
      );
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["advisor"] });
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-intelligence"] });
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: REWARDS_KEY });
        void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
      }, 1500);
      onConfirmed();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: AiMessageDto }>(
        `/ai/messages/${message.id}/cancel`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
    },
  });

  if (!draft) return null;

  if (isStockDraft(draft) || isPaymentDraft(draft)) {
    const title = isStockDraft(draft) ? shop.confirmStock : shop.confirmPayment;
    const summary = isStockDraft(draft)
      ? `${draft.productName}: ${draft.quantityDelta > 0 ? "+" : ""}${draft.quantityDelta}`
      : `${draft.customerName}: ${formatEtb(draft.amount)}`;
    if (message.actionStatus === "CONFIRMED") {
      return (
        <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {summary} · {t.confirmedBadge}
        </div>
      );
    }
    if (message.actionStatus === "CANCELLED") {
      return (
        <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">
          {summary} · {t.cancelledBadge}
        </div>
      );
    }
    return (
      <div className="mt-3 rounded-xl border border-emerald-300 bg-white p-3 text-slate-900">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-sm font-bold">{summary}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => confirmMutation.mutate()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            {t.confirmAction}
          </button>
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            {t.cancelAction}
          </button>
        </div>
      </div>
    );
  }

  if (!isTxDraft(draft)) return null;

  const isIncome = draft.type === "INCOME";

  if (message.actionStatus === "CONFIRMED") {
    return (
      <div className="mt-2.5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <span className="font-semibold">
          {isIncome ? "+" : "-"}
          {formatEtb(draft.amount)} · {t.categories[draft.category]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Check className="h-3 w-3" />
          {t.confirmedBadge}
        </span>
      </div>
    );
  }

  if (message.actionStatus === "CANCELLED") {
    return (
      <div className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 line-through">
        <span>
          {formatEtb(draft.amount)} · {t.categories[draft.category]}
        </span>
        <span className="no-underline">{t.cancelledBadge}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-300 bg-white p-3 text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {t.pendingReviewTitle}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            isIncome
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {isIncome ? t.incomeFilter : t.expenseFilter}
        </span>
      </div>

      {!isEditing ? (
        <div className="mt-2.5 space-y-1 text-xs">
          <div className="text-base font-bold text-slate-900">
            {isIncome ? "+" : "-"}
            {formatEtb(Number(amount) || draft.amount)}
          </div>
          <div className="text-slate-700">
            <span className="font-semibold">{t.categories[category]}</span> ·{" "}
            {t.paymentMethods[paymentMethod]}
            {counterpartyName ? ` · ${counterpartyName}` : ""}
          </div>
          <p className="text-slate-500">{description}</p>
        </div>
      ) : (
        <div className="mt-2.5 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 font-semibold"
              placeholder={t.amountLabel}
            />
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as TransactionCategory)
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethod)
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {t.paymentMethods[pm]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              placeholder={t.counterpartyLabel}
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descriptionLabel}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={confirmMutation.isPending || cancelMutation.isPending}
          onClick={() => confirmMutation.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {confirmMutation.isPending ? "..." : t.confirmAction}
        </button>

        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-3 w-3" />
          {t.editAction}
        </button>

        <button
          type="button"
          disabled={confirmMutation.isPending || cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          {t.cancelAction}
        </button>
      </div>
    </div>
  );
}

interface AssistantDrawerProps {
  open: boolean;
  autoStartVoice?: boolean;
  onAutoStartConsumed?: () => void;
  onClose: () => void;
  onOpenRewards?: () => void;
  onOpenCamera?: () => void;
  onOpenCredits?: () => void;
  onRecordByHand?: () => void;
}

export function AssistantDrawer({
  open,
  autoStartVoice,
  onAutoStartConsumed,
  onClose,
  onOpenRewards,
  onOpenCamera,
  onOpenCredits,
  onRecordByHand,
}: AssistantDrawerProps) {
  const { language, setLanguage, t } = useLanguage();
  const queryClient = useQueryClient();
  const rewardsText = REWARDS_TEXT[language];
  const subscription = useSubscription(open);
  const quota = subscription.data?.quota;
  const quotaOut = quota !== undefined && quota.remaining <= 0;

  /** Keeps the remaining-replies counter in step with what the server just spent. */
  const applyTtsQuota = (res: TtsResponse) => {
    queryClient.setQueryData(
      SUBSCRIPTION_KEY,
      (old: { quota: TtsResponse["quota"] } | undefined) =>
        old ? { ...old, quota: res.quota } : old
    );
  };
  const [inputText, setInputText] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [turnError, setTurnError] = useState<unknown>(null);
  const [voicePhase, setVoicePhase] = useState<
    "uploading" | "hearing" | "thinking" | "speaking" | null
  >(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [draftTranscript, setDraftTranscript] = useState("");
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecording,
    elapsedSec,
    liveTranscript,
    micError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder(language);

  const convoQuery = useQuery({
    queryKey: ["ai-conversation", language],
    queryFn: () =>
      apiRequest<{ conversation: ConversationDto; messages: AiMessageDto[] }>(
        `/ai/conversations/latest?language=${language}`
      ),
    enabled: open,
  });

  const conversationId = convoQuery.data?.conversation.id;
  const messages = convoQuery.data?.messages ?? [];

  useEffect(() => {
    if (open) {
      feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length, draftTranscript, liveTranscript, voicePhase]);

  useEffect(() => {
    if (open && autoStartVoice && !isRecording) {
      onAutoStartConsumed?.();
      void startRecording();
    }
  }, [open, autoStartVoice, isRecording, onAutoStartConsumed, startRecording]);

  const speakReply = async (text: string | null) => {
    if (!autoSpeak || !text?.trim()) return;
    setVoicePhase("speaking");
    try {
      const res = await apiRequest<TtsResponse>("/voice/tts", {
        method: "POST",
        body: JSON.stringify({ text, language }),
      });
      applyTtsQuota(res);
      // Out of spoken replies: the answer stays on screen as text.
      if (res.quotaExceeded) return;
      await playAssistantVoice({
        audioBase64: res.audioBase64,
        audioMimeType: res.audioMimeType,
        fallbackText: text,
        language,
      });
    } catch {
      await playAssistantVoice({
        audioBase64: null,
        audioMimeType: null,
        fallbackText: text,
        language,
      });
    } finally {
      setVoicePhase((current) => (current === "speaking" ? null : current));
    }
  };

  const chatMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest<AiTurnResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          language,
          conversationId,
          speakReply: false,
          modality: "TEXT",
        }),
      }),
    onSuccess: (turn) => {
      setTurnError(null);
      void queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      void speakReply(
        turn.assistantMessage.spokenText || turn.assistantMessage.displayText
      );
    },
    onError: (err) => {
      setTurnError(err);
    },
  });

  const replayMutation = useMutation({
    mutationFn: async (msg: AiMessageDto) => {
      const text = msg.spokenText || msg.displayText;
      const res = await apiRequest<TtsResponse>("/voice/tts", {
        method: "POST",
        body: JSON.stringify({ text, language }),
      });
      applyTtsQuota(res);
      if (res.quotaExceeded) return;
      await playAssistantVoice({
        audioBase64: res.audioBase64,
        audioMimeType: res.audioMimeType,
        fallbackText: text,
        language,
      });
    },
  });

  const handleMicToggle = async () => {
    stopActiveAudio();
    setTurnError(null);
    if (!isRecording) {
      await startRecording();
      return;
    }

    const recorded = await stopRecording();
    if (!recorded || recorded.blob.size === 0) return;

    const browserText = recorded.clientTranscriptFallback.trim();
    setDraftTranscript(browserText);

    try {
      let transcript = browserText;
      const canSkipUpload =
        (language === "am" || language === "en") && browserText.length >= 2;

      if (!canSkipUpload) {
        setVoicePhase("uploading");
        setUploadPct(4);
        const form = new FormData();
        const ext = recorded.mimeType.includes("mp4") ? "mp4" : "webm";
        form.append("audio", recorded.blob, `voice.${ext}`);
        form.append("language", language);
        if (browserText) {
          form.append("clientTranscriptFallback", browserText);
        }
        const stt = await apiUpload<{ transcript: string }>(
          "/voice/transcribe",
          form,
          (percent) => {
            setUploadPct(percent);
            if (percent >= 100) setVoicePhase("hearing");
          }
        );
        transcript = stt.transcript.trim();
        setDraftTranscript(transcript);
      }

      if (!transcript) {
        throw new Error(t.processingVoice);
      }

      setVoicePhase("thinking");
      const turn = await apiRequest<AiTurnResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: transcript,
          language,
          conversationId,
          speakReply: false,
          modality: "VOICE",
        }),
      });
      setDraftTranscript("");
      setVoicePhase(null);
      await queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
      await queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      await speakReply(
        turn.assistantMessage.spokenText || turn.assistantMessage.displayText
      );
    } catch (err) {
      setTurnError(err);
      setVoicePhase(null);
      setDraftTranscript("");
    } finally {
      setUploadPct(0);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || chatMutation.isPending || voiceBusy) return;
    setInputText("");
    chatMutation.mutate(trimmed);
  };

  if (!open) return null;

  const voiceBusy =
    voicePhase === "uploading" ||
    voicePhase === "hearing" ||
    voicePhase === "thinking";
  const isBusy = chatMutation.isPending || voiceBusy;
  const phaseLabel =
    voicePhase === "uploading"
      ? `${t.uploadingVoice} ${uploadPct}%`
      : voicePhase === "hearing"
        ? t.hearingVoice
        : voicePhase === "thinking" || chatMutation.isPending
          ? t.thinkingVoice
          : voicePhase === "speaking"
            ? t.speakingVoice
            : "";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {t.assistantTitle}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {t.assistantSubtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                stopActiveAudio();
                onClose();
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(["am", "om", "en"] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    language === code
                      ? "bg-white text-emerald-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {LANGUAGE_LABELS[code]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (autoSpeak) stopActiveAudio();
                setAutoSpeak((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                autoSpeak
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {autoSpeak ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {t.autoSpeakLabel}
            </button>
          </div>

          {quota && (
            <button
              type="button"
              onClick={onOpenRewards}
              disabled={!onOpenRewards}
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                quotaOut
                  ? "bg-rose-50 text-rose-700"
                  : quota.remaining <= 3
                    ? "bg-amber-50 text-amber-800"
                    : "bg-emerald-50 text-emerald-800"
              }`}
            >
              <Volume2 className="h-3 w-3" />
              {fill(rewardsText.quotaPill, { n: quota.remaining })}
            </button>
          )}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-700">
                {t.assistantSubtitle}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.samplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isBusy}
                    onClick={() => chatMutation.mutate(prompt)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "USER";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isUser
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {msg.modality === "VOICE" && (
                    <span
                      className={`mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${
                        isUser ? "text-emerald-100" : "text-emerald-700"
                      }`}
                    >
                      <Mic className="h-3 w-3" /> Voice
                    </span>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.displayText}
                  </p>

                  {!isUser && msg.proposedAction && (
                    <PendingActionCard
                      message={msg}
                      onConfirmed={() => undefined}
                    />
                  )}

                  {!isUser && (
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => replayMutation.mutate(msg)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-700"
                        title={t.replayAudio}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        {t.replayAudio}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {draftTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl bg-emerald-600 px-3.5 py-2.5 text-sm text-white">
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-100">
                  <Mic className="h-3 w-3" /> Voice
                </span>
                <p>{draftTranscript}</p>
              </div>
            </div>
          )}

          {(isBusy || voicePhase === "speaking") && (
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>{phaseLabel}</span>
              </div>
              {voicePhase === "uploading" && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${Math.max(uploadPct, 6)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {isInsufficientCredits(turnError) && (
            <CreditGate
              error={turnError}
              onBuyCredits={onOpenCredits}
              onRecordByHand={onRecordByHand}
            />
          )}
          {micError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {micError}
            </div>
          )}
          {Boolean(turnError) && !isInsufficientCredits(turnError) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {turnError instanceof Error ? turnError.message : "Request failed"}
            </div>
          )}

          {quotaOut && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              <p>{rewardsText.quotaOut}</p>
              {onOpenRewards && (
                <button
                  type="button"
                  onClick={onOpenRewards}
                  className="mt-1.5 font-bold text-emerald-700 underline underline-offset-2"
                >
                  {rewardsText.quotaOutAction}
                </button>
              )}
            </div>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Voice + Text Composer */}
        <div className="border-t border-slate-200 bg-white p-3.5">
          {messages.length > 0 && (
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
              {t.samplePrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isBusy || isRecording}
                  onClick={() => chatMutation.mutate(prompt)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="mb-2.5">
            <button
              type="button"
              disabled={voiceBusy || chatMutation.isPending}
              onClick={() => void handleMicToggle()}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                isRecording
                  ? "animate-pulse bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 fill-current" />
                  <span>
                    {t.listeningNow} ({elapsedSec}s) — {t.stopAndSend}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  <span>
                    {voicePhase === "speaking"
                      ? t.speakingVoice
                      : `${t.tapToSpeak} (${LANGUAGE_LABELS[language]})`}
                  </span>
                </>
              )}
            </button>
            {onOpenCamera && (
              <button
                type="button"
                disabled={isRecording || isBusy}
                onClick={onOpenCamera}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {t.capturePhoto}
              </button>
            )}
            {isRecording && liveTranscript && (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {liveTranscript}
              </p>
            )}
          </div>

          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              disabled={isRecording || isBusy}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.chatPlaceholder}
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isRecording || isBusy}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

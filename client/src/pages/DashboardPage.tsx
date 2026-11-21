import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  LogOut,
  MessageSquare,
  Mic,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CreateTransactionRequest,
  FinancialSummaryDto,
  LanguageCode,
  TransactionDto,
  TransactionType,
  UpdateTransactionRequest,
} from "@mizan/shared";
import { AssistantDrawer } from "../components/AssistantDrawer";
import { BusinessSettingsModal } from "../components/BusinessSettingsModal";
import { TransactionModal } from "../components/TransactionModal";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { MizanLogoMark } from "../components/brand/MizanLogo";
import { RewardsPanel } from "../components/RewardsPanel";
import { useRefreshBilling } from "../hooks/useBilling";
import { REWARDS_TEXT } from "../i18n/rewardsText";
import { LANGUAGE_LABELS } from "../i18n/translations";
import { apiRequest } from "../lib/api";
import { formatEtb, formatShortDate } from "../lib/format";

type SummaryRange = "today" | "week" | "month";
type LedgerFilter = "ALL" | "INCOME" | "EXPENSE" | "CREDIT";

export function DashboardPage() {
  const { business, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "rewards">(
    "dashboard"
  );
  const refreshBilling = useRefreshBilling();
  const rewardsText = REWARDS_TEXT[language];
  const [range, setRange] = useState<SummaryRange>("month");
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");

  const [txModalState, setTxModalState] = useState<{
    open: boolean;
    initialType: TransactionType;
    editing: TransactionDto | null;
  }>({ open: false, initialType: "INCOME", editing: null });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [autoStartVoice, setAutoStartVoice] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["summary", range],
    queryFn: () =>
      apiRequest<FinancialSummaryDto>(`/analytics/summary?range=${range}`),
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", activeTab === "dashboard" ? range : "all", ledgerFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("range", activeTab === "dashboard" ? range : "all");
      params.set("limit", activeTab === "dashboard" ? "25" : "100");
      if (ledgerFilter === "INCOME" || ledgerFilter === "EXPENSE") {
        params.set("type", ledgerFilter);
      }
      if (ledgerFilter === "CREDIT") {
        params.set("paymentMethod", "CREDIT");
      }
      return apiRequest<{ items: TransactionDto[]; totalCount: number }>(
        `/transactions?${params.toString()}`
      );
    },
  });

  const createTxMutation = useMutation({
    mutationFn: (payload: CreateTransactionRequest) =>
      apiRequest<TransactionDto>("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Points are granted a moment after the write, so check again shortly.
      window.setTimeout(refreshBilling, 1500);
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateTransactionRequest;
    }) =>
      apiRequest<TransactionDto>(`/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const voidTxMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<TransactionDto>(`/transactions/${id}/void`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const summary = summaryQuery.data;
  const transactions = transactionsQuery.data?.items ?? [];
  const expenseCategories = (summary?.byCategory ?? []).filter(
    (c) => c.type === "EXPENSE"
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <MizanLogoMark />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 sm:text-base">
                  {business?.name ?? t.appName}
                </span>
                {business && (
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">
                    {t.businessCategories[business.category]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className={`font-semibold ${
                    activeTab === "dashboard"
                      ? "text-emerald-700 underline underline-offset-4"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.dashboardTab}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className={`font-semibold ${
                    activeTab === "ledger"
                      ? "text-emerald-700 underline underline-offset-4"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.ledgerTab}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rewards")}
                  className={`font-semibold ${
                    activeTab === "rewards"
                      ? "text-emerald-700 underline underline-offset-4"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {rewardsText.tab}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {(["am", "om", "en"] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
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
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              title={t.shopSettings}
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
              title={t.signOut}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6">
        {/* Prominent Voice-First Hero Bar */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-950 p-5 text-white sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.assistantTitle}</span>
            </div>
            <h1 className="mt-1.5 text-lg font-bold sm:text-xl">
              {t.assistantSubtitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAutoStartVoice(true);
                setAssistantOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Mic className="h-4 w-4" />
              <span>{t.tapToSpeak}</span>
            </button>

            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-3.5 py-2.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{t.askMizan}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setTxModalState({
                  open: true,
                  initialType: "INCOME",
                  editing: null,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4 text-emerald-300" />
              <span>{t.recordIncome}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setTxModalState({
                  open: true,
                  initialType: "EXPENSE",
                  editing: null,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4 text-rose-300" />
              <span>{t.recordExpense}</span>
            </button>
          </div>
        </div>

        {activeTab === "dashboard" && (
          <>
            {/* Range Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">
                {t.dashboardTab}
              </h2>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {(
                  [
                    { id: "today", label: t.rangeToday },
                    { id: "week", label: t.rangeWeek },
                    { id: "month", label: t.rangeMonth },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRange(item.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      range === item.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Deterministic KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{t.todayIncome}</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-xl font-extrabold text-emerald-700">
                  {formatEtb(summary?.today.income ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{t.todayExpenses}</span>
                  <ArrowDownRight className="h-4 w-4 text-rose-600" />
                </div>
                <p className="mt-2 text-xl font-extrabold text-rose-600">
                  {formatEtb(summary?.today.expense ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-medium text-slate-500">
                  {t.todayProfit}
                </span>
                <p
                  className={`mt-2 text-xl font-extrabold ${
                    (summary?.today.netProfit ?? 0) >= 0
                      ? "text-slate-900"
                      : "text-rose-600"
                  }`}
                >
                  {formatEtb(summary?.today.netProfit ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{t.periodNetCashFlow}</span>
                  {summary?.period.vsPreviousIncomePct !== null &&
                    summary?.period.vsPreviousIncomePct !== undefined && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {summary.period.vsPreviousIncomePct >= 0 ? "+" : ""}
                        {summary.period.vsPreviousIncomePct}%
                      </span>
                    )}
                </div>
                <p
                  className={`mt-2 text-xl font-extrabold ${
                    (summary?.period.netCashFlow ?? 0) >= 0
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {formatEtb(summary?.period.netCashFlow ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t.operatingProfitHint}:{" "}
                  <span className="font-semibold text-slate-700">
                    {formatEtb(
                      summary?.period.operatingProfitExclInventory ?? 0
                    )}
                  </span>
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t.cashFlowChartTitle}
                  </h3>
                  {(summary?.period.creditReceivableTotal ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      {t.creditReceivableHint}:{" "}
                      {formatEtb(summary?.period.creditReceivableTotal ?? 0)}
                    </span>
                  )}
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary?.dailySeries ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        formatter={(value: number) => formatEtb(value)}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar
                        dataKey="income"
                        name={t.incomeFilter}
                        fill="#059669"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        name={t.expenseFilter}
                        fill="#e11d48"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4">
                <h3 className="mb-4 text-sm font-bold text-slate-900">
                  {t.expenseBreakdownTitle}
                </h3>
                {expenseCategories.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    {t.noTransactionsYet}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {expenseCategories.map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {t.categories[cat.category]}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatEtb(cat.amount)} ({cat.sharePct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${Math.min(cat.sharePct, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "rewards" && <RewardsPanel />}

        {/* Transactions Feed / Ledger */}
        {activeTab !== "rewards" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">
              {t.recentTransactionsTitle}
            </h3>

            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  { id: "ALL", label: t.allFilter },
                  { id: "INCOME", label: t.incomeFilter },
                  { id: "EXPENSE", label: t.expenseFilter },
                  { id: "CREDIT", label: t.creditFilter },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLedgerFilter(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    ledgerFilter === tab.id
                      ? "bg-white text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {transactions.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">
              {t.noTransactionsYet}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                return (
                  <div
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {tx.description}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {t.categories[tx.category]}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          {t.paymentMethods[tx.paymentMethod]}
                        </span>
                        {tx.source === "VOICE" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <Mic className="h-2.5 w-2.5" /> VOICE
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatShortDate(tx.transactionDate)}
                        {tx.counterpartyName ? ` · ${tx.counterpartyName}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-bold ${
                          isIncome ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatEtb(tx.amount)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setTxModalState({
                            open: true,
                            initialType: tx.type,
                            editing: tx,
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title={t.editAction}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => voidTxMutation.mutate(tx.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title={t.voidEntry}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </main>

      {/* Floating Mobile Quick Mic Button */}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700"
      >
        <Mic className="h-5 w-5" />
        <span>{t.askMizan}</span>
      </button>

      {txModalState.open && (
        <TransactionModal
          initialType={txModalState.initialType}
          editingTransaction={txModalState.editing}
          onClose={() =>
            setTxModalState({ open: false, initialType: "INCOME", editing: null })
          }
          onCreate={async (payload) => {
            await createTxMutation.mutateAsync(payload);
          }}
          onUpdate={async (id, payload) => {
            await updateTxMutation.mutateAsync({ id, payload });
          }}
        />
      )}

      {settingsOpen && (
        <BusinessSettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      <AssistantDrawer
        open={assistantOpen}
        autoStartVoice={autoStartVoice}
        onAutoStartConsumed={() => setAutoStartVoice(false)}
        onClose={() => setAssistantOpen(false)}
        onOpenRewards={() => {
          setAssistantOpen(false);
          setActiveTab("rewards");
        }}
      />
    </div>
  );
}

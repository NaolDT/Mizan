/**
 * MIZAN AI — FROZEN SHARED API CONTRACTS & DOMAIN TYPES
 * Agreed in Phase 1 between Developer 1 (server) and Developer 2 (client).
 * Do not modify without cross-developer coordination.
 */

export type LanguageCode = "am" | "om" | "en";

export type UserRole = "OWNER" | "ADMIN";

export type BusinessCategory =
  | "RETAIL"
  | "GROCERY"
  | "CAFE_RESTAURANT"
  | "TRADER"
  | "WHOLESALE"
  | "SERVICE"
  | "OTHER";

export type SubscriptionPlan = "FREE" | "STARTER" | "PRO" | "BUSINESS";

export type TransactionType = "INCOME" | "EXPENSE";

export type IncomeCategory = "SALES" | "SERVICE_INCOME" | "OTHER_INCOME";

export type ExpenseCategory =
  | "INVENTORY_PURCHASE"
  | "TRANSPORT"
  | "RENT"
  | "UTILITIES"
  | "SALARY"
  | "FOOD"
  | "MARKETING"
  | "OTHER_EXPENSE";

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export type PaymentMethod = "CASH" | "TELEBIRR" | "BANK" | "CREDIT";

export type TransactionSource = "VOICE" | "CHAT" | "MANUAL";

export type TransactionStatus = "COMPLETED" | "VOIDED";

export type DateRangePreset = "today" | "week" | "month" | "all";

export type MessageRole = "USER" | "ASSISTANT";

export type MessageModality = "TEXT" | "VOICE";

export type ActionStatus =
  | "NONE"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "CANCELLED";

export type SupportedAiIntent =
  | "record_income"
  | "record_expense"
  | "confirm_pending_action"
  | "cancel_pending_action"
  | "query_financial_summary"
  | "analyze_expenses"
  | "list_recent_transactions"
  | "business_advice"
  | "general_greeting"
  | "clarification_needed";

// ─────────────────────────────────────────────────────────────────────────────
// Standard API Envelopes
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ─────────────────────────────────────────────────────────────────────────────
// User & Business DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferredLanguage: LanguageCode;
  role: UserRole;
  createdAt: string;
}

export interface BusinessDto {
  id: string;
  ownerId: string;
  name: string;
  category: BusinessCategory;
  location: string | null;
  currency: "ETB";
  preferredLanguage: LanguageCode;
  plan: SubscriptionPlan;
  createdAt: string;
}

export interface RegisterRequest {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  businessName: string;
  businessCategory: BusinessCategory;
  location?: string;
  preferredLanguage: LanguageCode;
}

export interface LoginRequest {
  identifier: string; // phone OR email
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
  business: BusinessDto;
}

export interface UpdateBusinessRequest {
  name?: string;
  category?: BusinessCategory;
  location?: string | null;
  preferredLanguage?: LanguageCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Ledger & Analytics DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface TransactionDto {
  id: string;
  businessId: string;
  recordedById: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number; // Exact 2-decimal representation serialized from Prisma.Decimal
  currency: "ETB";
  description: string;
  paymentMethod: PaymentMethod;
  counterpartyName: string | null;
  transactionDate: string; // ISO 8601
  source: TransactionSource;
  status: TransactionStatus;
  createdAt: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  counterpartyName?: string | null;
  transactionDate?: string;
  source?: TransactionSource;
  idempotencyKey: string;
}

export interface UpdateTransactionRequest {
  category?: TransactionCategory;
  amount?: number;
  description?: string;
  paymentMethod?: PaymentMethod;
  counterpartyName?: string | null;
  transactionDate?: string;
}

export interface CategoryBreakdownItem {
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  transactionCount: number;
  sharePct: number;
}

export interface DailyCashFlowPoint {
  date: string; // YYYY-MM-DD in Africa/Addis_Ababa
  income: number;
  expense: number;
  netProfit: number;
}

export interface FinancialSummaryDto {
  currency: "ETB";
  range: Exclude<DateRangePreset, "all">;
  generatedAtEat: string;
  today: {
    income: number;
    expense: number;
    netProfit: number;
    transactionCount: number;
  };
  period: {
    income: number;
    expense: number;
    operatingProfitExclInventory: number;
    inventoryPurchases: number;
    netCashFlow: number;
    creditReceivableTotal: number;
    transactionCount: number;
    vsPreviousIncomePct: number | null;
    vsPreviousExpensePct: number | null;
  };
  byCategory: CategoryBreakdownItem[];
  dailySeries: DailyCashFlowPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Business Assistant & Voice DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposedTransactionDraft {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: "ETB";
  description: string;
  paymentMethod: PaymentMethod;
  counterpartyName: string | null;
  transactionDate: string; // ISO date or YYYY-MM-DD
}

export interface AiMessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  modality: MessageModality;
  displayText: string;
  spokenText: string | null;
  rawTranscript: string | null;
  intent: SupportedAiIntent | null;
  confidence: number | null;
  proposedAction: ProposedTransactionDraft | null;
  actionStatus: ActionStatus;
  linkedTransactionId: string | null;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  businessId: string;
  language: LanguageCode;
  title: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  language: LanguageCode;
  conversationId?: string;
  speakReply?: boolean;
  modality?: MessageModality;
}

export interface AiTurnResponse {
  conversationId: string;
  userMessage: AiMessageDto;
  assistantMessage: AiMessageDto;
  audioBase64: string | null;
  audioMimeType: string | null;
  ttsProvider: string | null;
}

export interface VoiceTurnResponse extends AiTurnResponse {
  sttProvider: string;
  latencyMs: number;
}

export interface ConfirmActionRequest {
  idempotencyKey: string;
  overrides?: Partial<Omit<ProposedTransactionDraft, "currency">>;
}

export interface ConfirmActionResponse {
  message: AiMessageDto;
  transaction: TransactionDto;
  summary: FinancialSummaryDto;
}

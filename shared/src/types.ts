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

export type TransactionSource = "VOICE" | "CHAT" | "MANUAL" | "CAMERA";

export type TransactionStatus = "COMPLETED" | "VOIDED";

export type DateRangePreset = "today" | "week" | "month" | "all";

export type MessageRole = "USER" | "ASSISTANT";

export type MessageModality = "TEXT" | "VOICE" | "IMAGE";

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
  | "clarification_needed"
  | "query_inventory"
  | "adjust_stock"
  | "query_customer_balance"
  | "record_customer_payment";

export type StockMovementReason = "RESTOCK" | "SALE" | "ADJUSTMENT";

export type CustomerLedgerType = "CREDIT_SALE" | "PAYMENT" | "REVERSAL";

export type PurchaseOrderStatus = "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export type SupplierLedgerType = "PURCHASE" | "PAYMENT" | "REVERSAL";

export type ShopLoyaltyType = "EARN" | "REDEEM" | "REVERSAL";

export type CustomerSegment = "NEW" | "REGULAR" | "FREQUENT" | "INACTIVE" | "OWING";

export type InsightSeverity = "info" | "warning";

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
  loyaltyEnabled: boolean;
  loyaltyEtbPerPoint: number;
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
  referralCode?: string;
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
  loyaltyEnabled?: boolean;
  loyaltyEtbPerPoint?: number;
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
  customerId: string | null;
  productId: string | null;
  quantity: number | null;
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
  customerId?: string | null;
  productId?: string | null;
  quantity?: number | null;
  purchaseOrderId?: string | null;
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
  customerId?: string | null;
  productId?: string | null;
  quantity?: number | null;
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

export interface PaymentMethodBreakdownItem {
  method: PaymentMethod;
  income: number;
  transactionCount: number;
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
  byPaymentMethod: PaymentMethodBreakdownItem[];
  dailySeries: DailyCashFlowPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Business Assistant & Voice DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface ProposedTransactionDraft {
  kind?: "TRANSACTION";
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: "ETB";
  description: string;
  paymentMethod: PaymentMethod;
  counterpartyName: string | null;
  customerName?: string | null;
  productName?: string | null;
  quantity?: number | null;
  transactionDate: string; // ISO date or YYYY-MM-DD
}

export interface ProposedStockDraft {
  kind: "STOCK";
  productName: string;
  quantityDelta: number;
  reason: StockMovementReason;
  note: string;
}

export interface ProposedCustomerPaymentDraft {
  kind: "CUSTOMER_PAYMENT";
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

export type ProposedActionDraft =
  | ProposedTransactionDraft
  | ProposedStockDraft
  | ProposedCustomerPaymentDraft;

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
  proposedAction: ProposedActionDraft | null;
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
  overrides?: Partial<Omit<ProposedTransactionDraft, "currency" | "kind">>;
}

export interface ConfirmActionResponse {
  message: AiMessageDto;
  transaction: TransactionDto | null;
  product: ProductDto | null;
  customer: CustomerDto | null;
  summary: FinancialSummaryDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription, Voice Allowance & Rewards DTOs
// ─────────────────────────────────────────────────────────────────────────────

export type ReferralStatus = "PENDING" | "QUALIFIED" | "REJECTED";

export type RewardEventType =
  | "EARN_FIRST_TRANSACTIONS"
  | "EARN_STREAK_7"
  | "EARN_REFERRAL_REFERRER"
  | "EARN_REFERRAL_WELCOME"
  | "REDEEM_EXTRA_VOICE"
  | "REDEEM_DISCOUNT"
  | "REDEEM_STARTER_WEEK";

export type RedeemOptionId = "EXTRA_VOICE" | "DISCOUNT_10" | "STARTER_WEEK";

export type RedeemBlockReason =
  | "NOT_ENOUGH_POINTS"
  | "ALREADY_ACTIVE"
  | "COOLDOWN";

export interface VoiceQuotaDto {
  plan: SubscriptionPlan;
  effectivePlan: SubscriptionPlan;
  monthlyAllowance: number;
  used: number;
  bonusReplies: number;
  remaining: number;
  trialEndsAt: string | null;
  periodResetsOn: string; // YYYY-MM-DD in Africa/Addis_Ababa
}

export interface PlanOfferDto {
  plan: SubscriptionPlan;
  priceEtb: number;
  monthlyReplies: number;
}

export interface SubscriptionSummaryDto {
  quota: VoiceQuotaDto;
  plans: PlanOfferDto[];
  voicePack: { replies: number; priceEtb: number };
  nextBillDiscountPct: number;
  manualBillingEnabled: boolean;
}

export interface BillingActionResponse {
  summary: SubscriptionSummaryDto;
  chargedEtb: number;
  discountAppliedPct: number;
}

export interface ChangePlanRequest {
  plan: SubscriptionPlan;
}

export interface TtsResponse {
  audioBase64: string | null;
  audioMimeType: string | null;
  provider: string | null;
  quotaExceeded: boolean;
  quota: VoiceQuotaDto;
}

export interface RewardLedgerEntryDto {
  id: string;
  type: RewardEventType;
  points: number;
  createdAt: string;
}

export interface ReferralProgressDto {
  transactions: number;
  required: number;
  windowEndsAt: string;
}

export interface ReferralDto {
  id: string;
  status: ReferralStatus;
  referredShopName: string | null;
  progress: ReferralProgressDto;
  qualifiedAt: string | null;
  rejectionReason: string | null;
  pointsEarned: number;
  createdAt: string;
}

export interface RedeemOptionDto {
  id: RedeemOptionId;
  costPoints: number;
  available: boolean;
  blockedReason: RedeemBlockReason | null;
}

export interface RewardRulesDto {
  firstTransactionsRequired: number;
  firstTransactionsPoints: number;
  streakDays: number;
  streakPoints: number;
  referralWindowDays: number;
  referralMinTransactions: number;
  referrerPoints: number;
  referredPoints: number;
  welcomeReplies: number;
}

export interface RewardSummaryDto {
  balance: number;
  referralCode: string;
  referralLinkPath: string;
  referrals: ReferralDto[];
  referredBy: {
    status: ReferralStatus;
    rejectionReason: string | null;
    progress: ReferralProgressDto;
  } | null;
  ledger: RewardLedgerEntryDto[];
  redeemOptions: RedeemOptionDto[];
  rules: RewardRulesDto;
}

export interface RedeemRequest {
  option: RedeemOptionId;
}

export interface RedeemResponse {
  rewards: RewardSummaryDto;
  subscription: SubscriptionSummaryDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers, Inventory & Insights DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerDto {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  outstandingBalance: number;
  lifetimeSpend: number;
  saleCount: number;
  lastPurchaseAt: string | null;
  loyaltyPoints: number;
  segment: CustomerSegment;
  createdAt: string;
}

export interface CustomerLedgerEntryDto {
  id: string;
  type: CustomerLedgerType;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CustomerPurchaseDto {
  id: string;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  transactionDate: string;
}

export interface ShopLoyaltyEntryDto {
  id: string;
  type: ShopLoyaltyType;
  points: number;
  note: string | null;
  createdAt: string;
}

export interface CustomerDetailDto extends CustomerDto {
  ledger: CustomerLedgerEntryDto[];
  purchases: CustomerPurchaseDto[];
  loyalty: ShopLoyaltyEntryDto[];
}

export interface RedeemShopLoyaltyRequest {
  points: number;
  note?: string;
  idempotencyKey: string;
}

export interface CheckoutSaleLine {
  productId: string;
  quantity: number;
}

export interface CheckoutSaleRequest {
  idempotencyKey: string;
  paymentMethod?: PaymentMethod;
  customerId?: string | null;
  counterpartyName?: string | null;
  discountAmount?: number;
  lines: CheckoutSaleLine[];
}

export interface CheckoutSaleResponse {
  transactions: TransactionDto[];
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string | null;
  notes?: string | null;
}

export interface RecordCustomerPaymentRequest {
  amount: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  idempotencyKey: string;
}

export interface SupplierDto {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  notes: string | null;
  outstandingBalance: number;
  createdAt: string;
}

export interface SupplierLedgerEntryDto {
  id: string;
  type: SupplierLedgerType;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface SupplierDetailDto extends SupplierDto {
  ledger: SupplierLedgerEntryDto[];
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierRequest {
  name?: string;
  phone?: string | null;
  notes?: string | null;
}

export interface RecordSupplierPaymentRequest {
  amount: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  idempotencyKey: string;
}

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrderDto {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  itemCount: number;
  orderedTotal: number;
  receivedTotal: number;
  createdAt: string;
}

export interface PurchaseOrderDetailDto extends PurchaseOrderDto {
  items: PurchaseOrderItemDto[];
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  notes?: string | null;
  idempotencyKey: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export interface ReceivePurchaseRequest {
  idempotencyKey: string;
  paymentMethod?: PaymentMethod;
  lines: Array<{
    itemId: string;
    quantity: number;
  }>;
}

export interface ProductDto {
  id: string;
  businessId: string;
  name: string;
  brand: string | null;
  sizeLabel: string | null;
  categoryLabel: string | null;
  barcode: string | null;
  unit: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  maxStockLevel: number;
  sellingPrice: number | null;
  costPrice: number | null;
  hasImage: boolean;
  isLowStock: boolean;
  createdAt: string;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  productName: string;
  quantityDelta: number;
  quantityAfter: number;
  reason: StockMovementReason;
  note: string | null;
  createdAt: string;
}

export interface CreateProductRequest {
  name: string;
  brand?: string | null;
  sizeLabel?: string | null;
  categoryLabel?: string | null;
  barcode?: string | null;
  aliases?: string | null;
  unit?: string;
  quantityOnHand?: number;
  lowStockThreshold?: number;
  maxStockLevel?: number;
  sellingPrice?: number | null;
  costPrice?: number | null;
}

export interface UpdateProductRequest {
  name?: string;
  brand?: string | null;
  sizeLabel?: string | null;
  categoryLabel?: string | null;
  barcode?: string | null;
  aliases?: string | null;
  unit?: string;
  lowStockThreshold?: number;
  maxStockLevel?: number;
  sellingPrice?: number | null;
  costPrice?: number | null;
}

export interface AdjustStockRequest {
  quantityDelta: number;
  reason: StockMovementReason;
  note?: string;
}

export type StockCoverConfidence = "estimated" | "uncertain" | "none";

export interface ProductProfitabilityDto {
  productId: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  salesCount: number;
  quantitySold: number;
  revenue: number;
  cogs: number | null;
  grossProfit: number | null;
  stockCostValue: number | null;
  dailySalesRate: number | null;
  daysOfCover: number | null;
  coverConfidence: StockCoverConfidence;
}

export type InventoryMovementClass = "fast" | "slow" | "dead" | "ok";

export type InventoryDemandTrend = "up" | "down" | "steady" | "unknown";

export type ReorderReason = "cover" | "threshold";

export interface InventoryIntelligenceItemDto extends ProductProfitabilityDto {
  maxStockLevel: number;
  lowStockThreshold: number;
  classification: InventoryMovementClass;
  demandTrend: InventoryDemandTrend;
  shouldReorder: boolean;
  suggestedReorderQty: number | null;
  reorderReason: ReorderReason | null;
  daysSinceLastSale: number | null;
}

export interface InventoryIntelligenceDto {
  range: Exclude<DateRangePreset, "all">;
  generatedAtEat: string;
  items: InventoryIntelligenceItemDto[];
  reorderSoon: InventoryIntelligenceItemDto[];
  fastMoving: InventoryIntelligenceItemDto[];
  slowMoving: InventoryIntelligenceItemDto[];
  deadStock: InventoryIntelligenceItemDto[];
  demandUp: InventoryIntelligenceItemDto[];
}

export type BusinessNoticeKind =
  | "STOCK_COVER"
  | "LOW_STOCK"
  | "DEAD_STOCK"
  | "SLOW_MOVING"
  | "INCOME_DOWN"
  | "EXPENSES_UP"
  | "OUTSTANDING"
  | "NEED_RECORDS"
  | "DEMAND_UP";

export interface BusinessNoticeDto {
  id: string;
  kind: BusinessNoticeKind;
  severity: InsightSeverity;
  entityType: "PRODUCT" | "CUSTOMER" | "NONE";
  entityId: string | null;
  title: string;
  body: string;
  createdAt: string;
}

export interface CashFlowDailyPoint {
  date: string; // YYYY-MM-DD in Africa/Addis_Ababa
  collected: number;
  spent: number;
  net: number;
}

export interface CashFlowDto {
  currency: "ETB";
  range: Exclude<DateRangePreset, "all">;
  generatedAtEat: string;
  periodDays: number;
  cashIn: number;
  telebirrIn: number;
  bankIn: number;
  creditSales: number;
  collections: number;
  cashOut: number;
  telebirrOut: number;
  bankOut: number;
  creditPurchases: number;
  collectedIn: number;
  spent: number;
  netCashMovement: number;
  outstanding: number;
  customersOwingCount: number;
  dailySeries: CashFlowDailyPoint[];
}

export interface AdvisorFindingDto {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

export interface AdvisorProductRefDto {
  name: string;
  quantityOnHand: number;
  quantitySold: number;
  revenue: number;
  grossProfit: number | null;
  dailySalesRate: number | null;
  daysOfCover: number | null;
  coverConfidence: StockCoverConfidence;
}

export interface AdvisorReportDto {
  currency: "ETB";
  range: Exclude<DateRangePreset, "all">;
  generatedAtEat: string;
  dataSufficient: boolean;
  overview: AdvisorFindingDto;
  metrics: {
    income: number;
    expense: number;
    netProfit: number;
    cashCollected: number;
    creditSales: number;
    collections: number;
    cashSpent: number;
    netCashMovement: number;
    outstanding: number;
    inventoryCostValue: number;
  };
  positives: AdvisorFindingDto[];
  problems: AdvisorFindingDto[];
  actions: AdvisorFindingDto[];
  products: {
    best: AdvisorProductRefDto | null;
    slow: AdvisorProductRefDto[];
    lowStock: AdvisorProductRefDto[];
    daysOfCover: AdvisorProductRefDto[];
  };
}

export interface InventoryValuationDto {
  productCount: number;
  costValue: number;
  retailValue: number;
}

export interface ProductPriceHistoryDto {
  id: string;
  productId: string;
  sellingPrice: number | null;
  costPrice: number | null;
  previousSelling: number | null;
  previousCost: number | null;
  createdAt: string;
}

export interface InsightItemDto {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

export interface BusinessInsightsDto {
  generatedAtEat: string;
  range: Exclude<DateRangePreset, "all">;
  items: InsightItemDto[];
  lowStockCount: number;
  customersOwingCount: number;
  outstandingTotal: number;
}

export type VisionWorkflow =
  | "QUICK_SALE"
  | "ADD_INVENTORY"
  | "SCAN_RECEIPT"
  | "IDENTIFY"
  | "GENERAL";

export type VisionMatchConfidence = "high" | "medium" | "low" | "none";

export interface VisionDetectedItem {
  detectedName: string;
  brand: string | null;
  sizeLabel: string | null;
  barcode: string | null;
  quantityGuess: number;
  ocrText: string | null;
  match: {
    productId: string | null;
    productName: string | null;
    confidence: VisionMatchConfidence;
    score: number;
    sellingPrice: number | null;
    costPrice: number | null;
    quantityOnHand: number | null;
    unit: string | null;
    alternatives: Array<{ productId: string; productName: string; score: number }>;
  };
}

export interface VisionReceiptSummary {
  supplier: string | null;
  date: string | null;
  total: number | null;
}

export interface VisionAnalyzeResponse {
  workflow: VisionWorkflow;
  intentGuess: VisionWorkflow;
  items: VisionDetectedItem[];
  receipt: VisionReceiptSummary | null;
  catalogSize: number;
  provider: string;
  note: string | null;
}

export interface VisionSaleLineRequest {
  productId?: string | null;
  quantity: number;
  unitPriceOverride?: number | null;
  unmatchedAmount?: number | null;
  description: string;
  detectedName?: string | null;
  barcode?: string | null;
}

export interface VisionConfirmSaleRequest {
  idempotencyKey: string;
  paymentMethod?: PaymentMethod;
  customerName?: string | null;
  lines: VisionSaleLineRequest[];
}

export interface VisionConfirmPurchaseRequest {
  idempotencyKey: string;
  paymentMethod?: PaymentMethod;
  supplierName?: string | null;
  lines: Array<{
    productId?: string | null;
    quantity: number;
    unitCost: number;
    description: string;
    detectedName?: string | null;
  }>;
}

export interface VisionConfirmResult {
  transactions: TransactionDto[];
  totalAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI credit wallet, top-ups and payments
// ─────────────────────────────────────────────────────────────────────────────

export type CreditSource = "SUBSCRIPTION" | "PURCHASED" | "REFERRAL" | "PROMO" | "ADMIN";

export type CreditEntryType =
  | "ALLOCATION"
  | "USAGE"
  | "TOPUP"
  | "REFERRAL_REWARD"
  | "PROMO_REWARD"
  | "ADMIN_GRANT"
  | "ADMIN_DEBIT"
  | "EXPIRATION"
  | "REFUND";

export type BillingProviderCode = "CHAPA" | "DEV";

export type BillingPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type BillingPaymentPurpose = "SUBSCRIPTION" | "TOPUP";

export type AiCreditFeature = "TEXT_CHAT" | "VOICE_TURN" | "TTS" | "VISION" | "RECEIPT";

export type BillingNoticeKind =
  | "LOW_CREDITS"
  | "TOPUP_PAID"
  | "SUBSCRIPTION_PAID"
  | "CREDITS_EXPIRED"
  | "PAYMENT_FAILED"
  | "REFERRAL_CREDITS"
  | "PROMO_CREDITS"
  | "SUBSCRIPTION_ENDED";

export type SubscriptionStatus = "FREE" | "ACTIVE" | "CANCEL_SCHEDULED" | "EXPIRED";

export interface CreditBalanceDto {
  source: CreditSource;
  remaining: number;
  expiringWithin7Days: number;
}

export interface BillingPlanDto {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  priceEtb: number;
  monthlyCredits: number;
  monthlyReplies: number;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
  analyticsEnabled: boolean;
  productLimit: number | null;
  customerLimit: number | null;
  etbPerCredit: number | null;
  active: boolean;
}

export interface TopUpPackageDto {
  code: string;
  name: string;
  description: string;
  priceEtb: number;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  validityDays: number;
  etbPerCredit: number;
}

export interface CreditLedgerDto {
  id: string;
  type: CreditEntryType;
  source: CreditSource;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface BillingNoticeDto {
  id: string;
  kind: BillingNoticeKind;
  amount: number | null;
  createdAt: string;
}

export interface PaymentProviderDto {
  code: BillingProviderCode;
  name: string;
  description: string;
}

export interface WalletDto {
  total: number;
  balances: CreditBalanceDto[];
  expiringWithin7Days: number;
  nextExpiryAt: string | null;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    paidUntil: string | null;
    monthlyCredits: number;
    priceEtb: number;
    periodResetsOn: string;
  };
  plans: BillingPlanDto[];
  packages: TopUpPackageDto[];
  prices: { feature: AiCreditFeature; credits: number }[];
  providers: PaymentProviderDto[];
  ledger: CreditLedgerDto[];
  notices: BillingNoticeDto[];
  bestSubscriptionEtbPerCredit: number | null;
  cheapestTopUpEtbPerCredit: number | null;
  subscriptionSavingsPct: number | null;
  topUpSpendThisMonthEtb: number;
  suggestedPlan: SubscriptionPlan | null;
}

export interface CheckoutRequest {
  purpose: BillingPaymentPurpose;
  provider: BillingProviderCode;
  plan?: SubscriptionPlan;
  packageCode?: string;
}

export interface CheckoutResponse {
  txRef: string;
  checkoutUrl: string;
  amountEtb: number;
  credits: number;
  provider: BillingProviderCode;
  devSimulation: boolean;
}

export interface PaymentStatusDto {
  txRef: string;
  status: BillingPaymentStatus;
  purpose: BillingPaymentPurpose;
  amountEtb: number;
  credits: number;
  provider: BillingProviderCode;
  title: string;
  fulfilled: boolean;
}

export interface DevPaymentSimulationRequest {
  txRef: string;
  outcome: "success" | "failed" | "pending" | "cancelled";
}

import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai";
import { Prisma, type AiMessage } from "@prisma/client";
import type {
  AiMessageDto,
  AiTurnResponse,
  ConfirmActionRequest,
  ConfirmActionResponse,
  ConversationDto,
  LanguageCode,
  MessageModality,
  PaymentMethod,
  ProposedActionDraft,
  ProposedCustomerPaymentDraft,
  ProposedStockDraft,
  ProposedTransactionDraft,
  StockMovementReason,
  SupportedAiIntent,
  TransactionCategory,
} from "@mizan/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/apiResponse.js";
import { formatEatDateKey } from "../../utils/eatDate.js";
import { normalizeSpokenText } from "../../utils/spokenText.js";
import {
  buildAiContextSnapshot,
  getFinancialSummary,
  type AiBusinessContextSnapshot,
} from "../analytics/analytics.service.js";
import {
  findCustomerByName,
  getCustomer,
  recordCustomerPayment,
} from "../customers/customers.service.js";
import {
  adjustStock,
  findOrCreateProductByName,
  findProductByName,
  getProduct,
} from "../inventory/inventory.service.js";
import {
  coerceCategoryForType,
  createTransaction,
  mapTransactionDto,
} from "../transactions/transaction.service.js";
import { synthesizeMeteredSpeech } from "../voice/voice.metered.js";

interface StructuredLlmResult {
  intent: SupportedAiIntent;
  confidence: number;
  displayMessage: string;
  spokenMessage: string;
  proposedTransaction?: {
    type: "INCOME" | "EXPENSE";
    category: TransactionCategory;
    amount: number;
    description: string;
    paymentMethod?: PaymentMethod;
    counterpartyName?: string | null;
    productName?: string | null;
    quantity?: number | null;
    transactionDate?: string;
  } | null;
  proposedStock?: {
    productName: string;
    quantityDelta: number;
    reason: StockMovementReason;
    note?: string;
  } | null;
  proposedPayment?: {
    customerName: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    note?: string;
  } | null;
}

const AI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: [
        "record_income",
        "record_expense",
        "confirm_pending_action",
        "cancel_pending_action",
        "query_financial_summary",
        "analyze_expenses",
        "list_recent_transactions",
        "business_advice",
        "general_greeting",
        "clarification_needed",
        "query_inventory",
        "adjust_stock",
        "query_customer_balance",
        "record_customer_payment",
      ],
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence between 0.0 and 1.0",
    },
    displayMessage: {
      type: Type.STRING,
      description:
        "Concise, friendly merchant response in the requested language using formatted ETB digits (e.g., 2,500 ETB).",
    },
    spokenMessage: {
      type: Type.STRING,
      description:
        "Spoken audio version of displayMessage in the requested language with ALL numbers written out in words (zero raw digits).",
    },
    proposedTransaction: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
        category: {
          type: Type.STRING,
          enum: [
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
          ],
        },
        amount: { type: Type.NUMBER },
        description: { type: Type.STRING },
        paymentMethod: {
          type: Type.STRING,
          enum: ["CASH", "TELEBIRR", "BANK", "CREDIT"],
          nullable: true,
        },
        counterpartyName: { type: Type.STRING, nullable: true },
        productName: { type: Type.STRING, nullable: true },
        quantity: { type: Type.NUMBER, nullable: true },
        transactionDate: {
          type: Type.STRING,
          description: "ISO date YYYY-MM-DD in East Africa Time",
          nullable: true,
        },
      },
      required: ["type", "category", "amount", "description"],
    },
    proposedStock: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        productName: { type: Type.STRING },
        quantityDelta: { type: Type.NUMBER },
        reason: { type: Type.STRING, enum: ["RESTOCK", "SALE", "ADJUSTMENT"] },
        note: { type: Type.STRING, nullable: true },
      },
      required: ["productName", "quantityDelta", "reason"],
    },
    proposedPayment: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        customerName: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        paymentMethod: {
          type: Type.STRING,
          enum: ["CASH", "TELEBIRR", "BANK", "CREDIT"],
          nullable: true,
        },
        note: { type: Type.STRING, nullable: true },
      },
      required: ["customerName", "amount"],
    },
  },
  required: ["intent", "confidence", "displayMessage", "spokenMessage"],
};

export function mapAiMessageDto(msg: AiMessage): AiMessageDto {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    role: msg.role,
    modality: msg.modality,
    displayText: msg.displayText,
    spokenText: msg.spokenText,
    rawTranscript: msg.rawTranscript,
    intent: (msg.intent as SupportedAiIntent | null) ?? null,
    confidence: msg.confidence,
    proposedAction: (msg.proposedAction as ProposedActionDraft | null) ?? null,
    actionStatus: msg.actionStatus,
    linkedTransactionId: msg.linkedTransactionId,
    createdAt: msg.createdAt.toISOString(),
  };
}

export async function getOrCreateLatestConversation(
  businessId: string,
  userId: string,
  language: LanguageCode = "am"
): Promise<{ conversation: ConversationDto; messages: AiMessageDto[] }> {
  let convo = await prisma.aiConversation.findFirst({
    where: { businessId, userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!convo) {
    convo = await prisma.aiConversation.create({
      data: {
        businessId,
        userId,
        language,
        title: "Mizan Business Assistant",
      },
    });
  }

  const messages = await prisma.aiMessage.findMany({
    where: { conversationId: convo.id, businessId },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  return {
    conversation: {
      id: convo.id,
      businessId: convo.businessId,
      language: convo.language,
      title: convo.title,
      updatedAt: convo.updatedAt.toISOString(),
    },
    messages: messages.map(mapAiMessageDto),
  };
}

function readErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function shortError(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
}

function isRetryableModelError(err: unknown): boolean {
  const status = readErrorStatus(err);
  const message = err instanceof Error ? err.message : String(err);
  return (
    status === 404 ||
    status === 429 ||
    status === 503 ||
    /high demand|UNAVAILABLE|NOT_FOUND|not found|RESOURCE_EXHAUSTED/i.test(message)
  );
}

/**
 * Deterministic fallback when every Gemini model is unavailable.
 * Parses Amharic, Afaan Oromo, and English patterns and uses real SQL numbers.
 */
function buildDeterministicFallbackResult(
  userText: string,
  language: LanguageCode,
  ctx: AiBusinessContextSnapshot,
  hasPendingDraft: boolean
): StructuredLlmResult {
  const lower = userText.toLowerCase();
  const todayStr = ctx.eatTodayDate;

  // Check yes/confirm for an active pending card
  if (
    hasPendingDraft &&
    /\b(confirm|yes|save|approve|eeyyee|mirkaneessi|galmeessi)\b/i.test(lower)
  ) {
    const msg =
      language === "am"
        ? "እባክዎ ከታች ያለውን 'አጽድቅ እና መዝግብ' ቁልፍ ይጫኑ።"
        : language === "om"
          ? "Maaloo qabduu 'Mirkaneessi' jedhu gadii tuqaa."
          : "Please tap the 'Confirm & Save' button on the preview card below.";
    return {
      intent: "confirm_pending_action",
      confidence: 0.9,
      displayMessage: msg,
      spokenMessage: normalizeSpokenText(msg, language),
      proposedTransaction: null,
    };
  }

  // Check numeric amount in text for recording income / expense
  const numMatch = userText.match(/(\d[\d,]*(?:\.\d+)?)/);
  const parsedAmount = numMatch ? Number(numMatch[1].replace(/,/g, "")) : null;

  const isExpense =
    /(spent|expense|paid|bought|rent|transport|ወጪ|አውጥቻለሁ|ከፈልኩ|ገዛሁ|ትራንስፖርት|ኪራይ|baasii|baase|kaffale|bite|geejjiba|kiraa)/i.test(
      userText
    );
  const isIncome =
    /(sold|sale|income|earned|revenue|ሸጫለሁ|ሽያጭ|ገቢ|አግኝቻለሁ|gurgure|gurgurtaa|galii|argadhe)/i.test(
      userText
    );

  const isInventoryAsk =
    /(how many|in stock|inventory|low stock|ክምችት|ቀርቷል|ዘይት|kuufama|meeqa qaba)/i.test(userText);
  const isStockAdjust =
    /(add .+ stock|restock|add \d+|ክምችት ጨምር|kuufama dabali)/i.test(userText);
  const isCustomerAsk =
    /(owe|owes|owed|outstanding|ይቀረኛል|ዱቤ|na hafaa|liqaa)/i.test(userText);

  if (isStockAdjust && parsedAmount && parsedAmount > 0 && !isIncome && !isExpense) {
    const productHint =
      ctx.products.find((p) => userText.toLowerCase().includes(p.name.toLowerCase()))?.name ??
      userText.replace(/\d[\d,]*(?:\.\d+)?/g, "").trim().slice(0, 80);
    const displayMessage =
      language === "am"
        ? `${productHint || "እቃ"} ላይ ${parsedAmount} ክምችት ለመጨመር አዘጋጅቻለሁ። ትክክል ከሆነ ያጽድቁት።`
        : language === "om"
          ? `${productHint || "Meeshaa"} irratti ${parsedAmount} kuufama dabaluuf qopheesseera. Mirkaneessi.`
          : `I prepared a stock increase of ${parsedAmount} for ${productHint || "this product"}. Confirm to save.`;
    return {
      intent: "adjust_stock",
      confidence: 0.85,
      displayMessage,
      spokenMessage: normalizeSpokenText(displayMessage, language),
      proposedStock: {
        productName: productHint || "product",
        quantityDelta: parsedAmount,
        reason: "RESTOCK",
        note: userText.trim().slice(0, 200),
      },
    };
  }

  if (isInventoryAsk && ctx.products.length > 0) {
    const named = ctx.products.find((p) => userText.toLowerCase().includes(p.name.toLowerCase()));
    const low = ctx.products.filter((p) => p.isLowStock);
    const displayMessage = named
      ? language === "am"
        ? `${named.name}: ${named.quantityOnHand} ${named.unit} በክምችት አለ።`
        : language === "om"
          ? `${named.name}: ${named.quantityOnHand} ${named.unit} kuufama keessa jira.`
          : `You currently have ${named.quantityOnHand} ${named.unit} of ${named.name} in stock.`
      : language === "am"
        ? low.length
          ? `${low.length} እቃ ዝቅተኛ ክምችት ላይ ነው፦ ${low.map((p) => p.name).join(", ")}።`
          : `የተመዘገቡ እቃዎች፦ ${ctx.products.map((p) => `${p.name} (${p.quantityOnHand})`).join(", ")}።`
        : language === "om"
          ? low.length
            ? `Meeshaaleen ${low.length} kuufama gadi aanaa qabu: ${low.map((p) => p.name).join(", ")}.`
            : `Kuufama: ${ctx.products.map((p) => `${p.name} (${p.quantityOnHand})`).join(", ")}.`
          : low.length
            ? `${low.length} product(s) are low: ${low.map((p) => p.name).join(", ")}.`
            : `Current stock: ${ctx.products.map((p) => `${p.name} ${p.quantityOnHand} ${p.unit}`).join("; ")}.`;
    return {
      intent: "query_inventory",
      confidence: 0.92,
      displayMessage,
      spokenMessage: normalizeSpokenText(displayMessage, language),
      proposedTransaction: null,
    };
  }

  if (isCustomerAsk) {
    const named = ctx.customersOwing.find((c) =>
      userText.toLowerCase().includes(c.name.toLowerCase())
    );
    const displayMessage = named
      ? language === "am"
        ? `${named.name} ${named.outstandingBalance.toLocaleString("en-US")} ETB ይቀረዎታል።`
        : language === "om"
          ? `${named.name} ETB ${named.outstandingBalance.toLocaleString("en-US")} si hafaa.`
          : `${named.name} currently has an outstanding balance of ${named.outstandingBalance.toLocaleString("en-US")} ETB.`
      : ctx.customersOwing.length === 0
        ? language === "am"
          ? "በአሁኑ ጊዜ ዱቤ የሚቀረው ደንበኛ የለም።"
          : language === "om"
            ? "Ammaaf maamilaan liqaa qabu hin jiru."
            : "No customer currently has an outstanding balance."
        : language === "am"
          ? `ዱቤ የሚቀሩት፦ ${ctx.customersOwing.map((c) => `${c.name} ${c.outstandingBalance.toLocaleString("en-US")} ETB`).join("፣ ")}።`
          : language === "om"
            ? `Maamiltoota liqaa qaban: ${ctx.customersOwing.map((c) => `${c.name} ETB ${c.outstandingBalance.toLocaleString("en-US")}`).join(", ")}.`
            : `Customers with outstanding balances: ${ctx.customersOwing.map((c) => `${c.name} ${c.outstandingBalance.toLocaleString("en-US")} ETB`).join("; ")}.`;
    return {
      intent: "query_customer_balance",
      confidence: 0.92,
      displayMessage,
      spokenMessage: normalizeSpokenText(displayMessage, language),
      proposedTransaction: null,
    };
  }

  if (parsedAmount && parsedAmount > 0 && (isIncome || isExpense)) {
    const txType = isExpense && !isIncome ? "EXPENSE" : "INCOME";
    let category: TransactionCategory = txType === "INCOME" ? "SALES" : "OTHER_EXPENSE";

    if (/(transport|bajaj|taxi|ትራንስፖርት|ታክሲ|ባጃጅ|geejjiba)/i.test(userText)) {
      category = "TRANSPORT";
    } else if (/(rent|ኪራይ|kiraa)/i.test(userText)) {
      category = "RENT";
    } else if (/(inventory|stock|restock|ዕቃ|ዱቄት|ዘይት|meeshaa)/i.test(userText) && txType === "EXPENSE") {
      category = "INVENTORY_PURCHASE";
    } else if (/(utility|electric|water|መብራት|ውሃ|ibsaa|bishaan)/i.test(userText)) {
      category = "UTILITIES";
    }

    const paymentMethod: PaymentMethod = /telebirr|ቴሌብር/i.test(userText)
      ? "TELEBIRR"
      : /credit|ብድር|ዱቤ|liqa/i.test(userText)
        ? "CREDIT"
        : "CASH";

    const fmtAmt = parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const displayMessage =
      language === "am"
        ? `${fmtAmt} ETB ${txType === "INCOME" ? "ገቢ" : "ወጪ"} (${category}) ለመመዝገብ አዘጋጅቻለሁ። ትክክል ከሆነ ያጽድቁት።`
        : language === "om"
          ? `${txType === "INCOME" ? "Galii" : "Baasii"} ETB ${fmtAmt} (${category}) galmeessuuf qopheesseera. Sirrii yoo ta'e mirkaneessi.`
          : `I prepared an ${txType.toLowerCase()} entry of ${fmtAmt} ETB under ${category}. Please confirm to save it to your ledger.`;

    return {
      intent: txType === "INCOME" ? "record_income" : "record_expense",
      confidence: 0.9,
      displayMessage,
      spokenMessage: normalizeSpokenText(displayMessage, language),
      proposedTransaction: {
        type: txType,
        category,
        amount: parsedAmount,
        description: userText.trim().slice(0, 200),
        paymentMethod,
        counterpartyName: null,
        transactionDate: todayStr,
      },
    };
  }

  // Otherwise answer financial summary using real SQL metrics!
  const tIncome = ctx.monthSummary.today.income.toLocaleString("en-US");
  const tExpense = ctx.monthSummary.today.expense.toLocaleString("en-US");
  const mIncome = ctx.monthSummary.period.income.toLocaleString("en-US");
  const mExpense = ctx.monthSummary.period.expense.toLocaleString("en-US");
  const mProfit = ctx.monthSummary.period.netCashFlow.toLocaleString("en-US");
  const topExpense = ctx.monthSummary.byCategory.find((c) => c.type === "EXPENSE");

  const summaryMsg =
    language === "am"
      ? `የ${ctx.business.name} የፋይናንስ ማጠቃለያ፦ ዛሬ ${tIncome} ETB ገቢ እና ${tExpense} ETB ወጪ ተመዝግቧል። በዚህ ወር ጠቅላላ ገቢ ${mIncome} ETB፣ ወጪ ${mExpense} ETB፣ የተጣራ ትርፍ ደግሞ ${mProfit} ETB ነው።${topExpense ? ` ትልቁ ወጪዎ ${topExpense.category} (${topExpense.amount.toLocaleString("en-US")} ETB) ነው።` : ""}`
      : language === "om"
        ? `Cuunfaa faayinaansii ${ctx.business.name}: Har'a galii ETB ${tIncome} fi baasii ETB ${tExpense} galmeessiteetta. Ji'a kana galii waliigalaa ETB ${mIncome}, baasii ETB ${mExpense}, bu'aan qulqulluun immoo ETB ${mProfit} dha.${topExpense ? ` Baasiin guddaan ${topExpense.category} (ETB ${topExpense.amount.toLocaleString("en-US")}) dha.` : ""}`
        : `Financial summary for ${ctx.business.name}: Today you recorded ${tIncome} ETB income and ${tExpense} ETB expenses. This month your total income is ${mIncome} ETB, total expenses are ${mExpense} ETB, and net cash profit is ${mProfit} ETB.${topExpense ? ` Your largest expense category is ${topExpense.category} (${topExpense.amount.toLocaleString("en-US")} ETB).` : ""}`;

  return {
    intent: "query_financial_summary",
    confidence: 0.95,
    displayMessage: summaryMsg,
    spokenMessage: normalizeSpokenText(summaryMsg, language),
    proposedTransaction: null,
  };
}

async function runGroundedLlmReasoning(
  userText: string,
  language: LanguageCode,
  ctx: AiBusinessContextSnapshot,
  recentHistory: Array<{ role: "USER" | "ASSISTANT"; text: string }>,
  pendingDraft: ProposedActionDraft | null
): Promise<StructuredLlmResult> {
  if (!env.GEMINI_API_KEY) {
    return buildDeterministicFallbackResult(userText, language, ctx, Boolean(pendingDraft));
  }

  const languageDirective =
    language === "am"
      ? "Respond strictly in natural Ethiopian Amharic (Ethiopic Ge'ez script). In `spokenMessage`, spell out EVERY number in Amharic words (no digits 0-9)."
      : language === "om"
        ? "Respond strictly in natural Afaan Oromo (Qubee Latin script). In `spokenMessage`, spell out EVERY number in Afaan Oromo words (no digits 0-9)."
        : "Respond strictly in clear, simple English suitable for a small shop owner. In `spokenMessage`, spell out numbers in words.";

  const systemInstruction = `You are Mizan AI, a trusted, voice-first financial & business management assistant for Ethiopian small merchants.
${languageDirective}

CRITICAL SAFETY & DETERMINISTIC RULES:
1. NEVER invent, guess, or calculate financial totals yourself. Use ONLY the exact pre-computed SQL numbers in BUSINESS_FINANCIAL_CONTEXT_JSON below.
2. Currency is Ethiopian Birr (ETB). Today's date in Addis Ababa (EAT, UTC+3) is ${ctx.eatTodayDate}.
3. If the merchant wants to record income/sales or an expense:
   - Extract type ("INCOME" or "EXPENSE"), category, positive numeric amount, concise description, paymentMethod ("CASH", "TELEBIRR", "BANK", or "CREDIT"), counterpartyName (if a person is named), productName and quantity if a product is named, and transactionDate (YYYY-MM-DD, default ${ctx.eatTodayDate}).
   - CREDIT sales: set paymentMethod CREDIT and counterpartyName to the customer.
   - If the amount is missing or unclear, set intent = "clarification_needed" and ask for the amount.
   - NEVER claim the change is already saved. Ask them to confirm the preview.
4. Inventory: for stock questions use PRODUCTS_JSON only. For adding/removing stock, set intent = "adjust_stock" and fill proposedStock (quantityDelta positive for restock, negative for sale/use). If the product name is unclear, ask which product.
5. Customers: for "how much does X owe" use CUSTOMERS_OWING_JSON only. For "X paid me N birr", set intent = "record_customer_payment" and fill proposedPayment. Never invent a balance.
6. Keep responses concise (2-4 short sentences) so voice playback stays short.

ACTIVE_PENDING_CONFIRMATION_DRAFT:
${pendingDraft ? JSON.stringify(pendingDraft) : "NONE"}

BUSINESS_FINANCIAL_CONTEXT_JSON:
${JSON.stringify({
  business: ctx.business,
  eatTodayDate: ctx.eatTodayDate,
  week: ctx.weekSummary,
  today: ctx.monthSummary.today,
  month: ctx.monthSummary.period,
  topCategories: ctx.monthSummary.byCategory.slice(0, 5),
  recentTransactions: ctx.recentTransactions.slice(0, 6).map((tx) => ({
    date: tx.transactionDate.slice(0, 10),
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    description: tx.description,
  })),
  products: ctx.products,
  customersOwing: ctx.customersOwing,
})}`;

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const contents = [
    ...recentHistory.slice(-6).map((turn) => ({
      role: turn.role === "USER" ? ("user" as const) : ("model" as const),
      parts: [{ text: turn.text }],
    })),
    {
      role: "user" as const,
      parts: [{ text: userText }],
    },
  ];

  const modelsToTry = [
    ...new Set([
      env.GEMINI_MODEL,
      env.GEMINI_FALLBACK_MODEL,
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash-lite",
    ]),
  ];

  const askModel = (modelName: string, useFastThinking: boolean) =>
    ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: AI_RESPONSE_SCHEMA,
        temperature: 0.2,
        ...(useFastThinking
          ? {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
                includeThoughts: false,
              },
            }
          : {}),
      },
    });

  for (const modelName of modelsToTry) {
    try {
      let response;
      try {
        response = await askModel(modelName, true);
      } catch (err) {
        if (isRetryableModelError(err)) throw err;
        response = await askModel(modelName, false);
      }

      const rawJson = response.text?.trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson) as StructuredLlmResult;
        return {
          ...parsed,
          spokenMessage: normalizeSpokenText(
            parsed.spokenMessage || parsed.displayMessage,
            language
          ),
        };
      }
    } catch (err) {
      const status = readErrorStatus(err);
      const message = err instanceof Error ? err.message : "Gemini request failed";
      console.warn(`[Gemini] ${modelName} failed (${status ?? "unknown"}). ${shortError(message)}`);
    }
  }

  return buildDeterministicFallbackResult(userText, language, ctx, Boolean(pendingDraft));
}

export async function processAssistantTurn(params: {
  businessId: string;
  userId: string;
  text: string;
  rawTranscript?: string | null;
  language: LanguageCode;
  modality: MessageModality;
  conversationId?: string;
  speakReply: boolean;
}): Promise<AiTurnResponse> {
  const trimmedText = params.text.trim();
  if (!trimmedText) {
    throw new AppError(400, "EMPTY_MESSAGE", "Message cannot be empty");
  }

  let conversation = params.conversationId
    ? await prisma.aiConversation.findFirst({
        where: { id: params.conversationId, businessId: params.businessId },
      })
    : null;

  if (!conversation) {
    const latest = await getOrCreateLatestConversation(
      params.businessId,
      params.userId,
      params.language
    );
    conversation = await prisma.aiConversation.findUniqueOrThrow({
      where: { id: latest.conversation.id },
    });
  }

  const [priorMessages, contextSnapshot] = await Promise.all([
    prisma.aiMessage.findMany({
      where: { conversationId: conversation.id, businessId: params.businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    buildAiContextSnapshot(params.businessId),
  ]);

  const orderedPrior = [...priorMessages].reverse();
  const latestPendingMsg = [...orderedPrior]
    .reverse()
    .find((m) => m.actionStatus === "PENDING_CONFIRMATION" && m.proposedAction);

  const userMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      businessId: params.businessId,
      role: "USER",
      modality: params.modality,
      displayText: trimmedText,
      rawTranscript: params.rawTranscript ?? null,
    },
  });

  const llmOutput = await runGroundedLlmReasoning(
    trimmedText,
    params.language,
    contextSnapshot,
    orderedPrior.map((m) => ({ role: m.role, text: m.displayText })),
    (latestPendingMsg?.proposedAction as ProposedActionDraft | null) ?? null
  );

  let validatedDraft: ProposedActionDraft | null = null;
  if (
    (llmOutput.intent === "record_income" || llmOutput.intent === "record_expense") &&
    llmOutput.proposedTransaction &&
    Number.isFinite(llmOutput.proposedTransaction.amount) &&
    llmOutput.proposedTransaction.amount > 0 &&
    llmOutput.confidence >= 0.65
  ) {
    const rawDraft = llmOutput.proposedTransaction;
    validatedDraft = {
      kind: "TRANSACTION",
      type: rawDraft.type,
      category: coerceCategoryForType(rawDraft.type, rawDraft.category),
      amount: Number(rawDraft.amount.toFixed(2)),
      currency: "ETB",
      description: rawDraft.description.trim().slice(0, 240) || trimmedText.slice(0, 240),
      paymentMethod: rawDraft.paymentMethod ?? "CASH",
      counterpartyName: rawDraft.counterpartyName?.trim() || null,
      customerName: rawDraft.counterpartyName?.trim() || null,
      productName: rawDraft.productName?.trim() || null,
      quantity:
        rawDraft.quantity != null && Number.isFinite(rawDraft.quantity)
          ? Number(rawDraft.quantity)
          : null,
      transactionDate: rawDraft.transactionDate || contextSnapshot.eatTodayDate,
    };
  } else if (
    llmOutput.intent === "adjust_stock" &&
    llmOutput.proposedStock &&
    llmOutput.proposedStock.productName.trim() &&
    Number.isFinite(llmOutput.proposedStock.quantityDelta) &&
    llmOutput.proposedStock.quantityDelta !== 0 &&
    llmOutput.confidence >= 0.65
  ) {
    const raw = llmOutput.proposedStock;
    validatedDraft = {
      kind: "STOCK",
      productName: raw.productName.trim().slice(0, 120),
      quantityDelta: Number(raw.quantityDelta.toFixed(2)),
      reason: raw.reason,
      note: raw.note?.trim().slice(0, 200) || trimmedText.slice(0, 200),
    };
  } else if (
    llmOutput.intent === "record_customer_payment" &&
    llmOutput.proposedPayment &&
    llmOutput.proposedPayment.customerName.trim() &&
    Number.isFinite(llmOutput.proposedPayment.amount) &&
    llmOutput.proposedPayment.amount > 0 &&
    llmOutput.confidence >= 0.65
  ) {
    const raw = llmOutput.proposedPayment;
    validatedDraft = {
      kind: "CUSTOMER_PAYMENT",
      customerName: raw.customerName.trim().slice(0, 120),
      amount: Number(raw.amount.toFixed(2)),
      paymentMethod: raw.paymentMethod ?? "CASH",
      note: raw.note?.trim().slice(0, 200) || trimmedText.slice(0, 200),
    };
  }

  // Handle voice/chat cancellation of an active pending draft
  if (llmOutput.intent === "cancel_pending_action" && latestPendingMsg) {
    await prisma.aiMessage.update({
      where: { id: latestPendingMsg.id },
      data: { actionStatus: "CANCELLED" },
    });
  }

  const assistantMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      businessId: params.businessId,
      role: "ASSISTANT",
      modality: params.modality,
      displayText: llmOutput.displayMessage,
      spokenText: llmOutput.spokenMessage,
      intent: llmOutput.intent,
      confidence: llmOutput.confidence,
      proposedAction: validatedDraft
        ? (validatedDraft as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      actionStatus: validatedDraft ? "PENDING_CONFIRMATION" : "NONE",
    },
  });

  await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: { language: params.language },
  });

  let audioBase64: string | null = null;
  let audioMimeType: string | null = null;
  let ttsProvider: string | null = null;

  if (params.speakReply) {
    const tts = await synthesizeMeteredSpeech(
      params.businessId,
      llmOutput.spokenMessage,
      params.language
    );
    audioBase64 = tts.audioBase64;
    audioMimeType = tts.audioMimeType;
    ttsProvider = tts.provider;
  }

  return {
    conversationId: conversation.id,
    userMessage: mapAiMessageDto(userMsg),
    assistantMessage: mapAiMessageDto(assistantMsg),
    audioBase64,
    audioMimeType,
    ttsProvider,
  };
}

export async function confirmProposedAction(
  businessId: string,
  userId: string,
  messageId: string,
  input: ConfirmActionRequest
): Promise<ConfirmActionResponse> {
  const message = await prisma.aiMessage.findFirst({
    where: { id: messageId, businessId },
  });

  if (!message || !message.proposedAction) {
    throw new AppError(404, "PROPOSED_ACTION_NOT_FOUND", "No pending transaction draft found");
  }

  if (message.actionStatus === "CANCELLED") {
    throw new AppError(400, "ACTION_CANCELLED", "This transaction draft was already cancelled");
  }

  if (message.actionStatus === "CONFIRMED" && message.linkedTransactionId) {
    const existingTx = await prisma.transaction.findFirstOrThrow({
      where: { id: message.linkedTransactionId, businessId },
    });
    const summary = await getFinancialSummary(businessId, "month");
    return {
      message: mapAiMessageDto(message),
      transaction: mapTransactionDto(existingTx),
      product: existingTx.productId ? await getProduct(businessId, existingTx.productId) : null,
      customer: existingTx.customerId
        ? await getCustomer(businessId, existingTx.customerId)
        : null,
      summary,
    };
  }

  if (message.actionStatus === "CONFIRMED") {
    const summary = await getFinancialSummary(businessId, "month");
    return {
      message: mapAiMessageDto(message),
      transaction: null,
      product: null,
      customer: null,
      summary,
    };
  }

  const draft = message.proposedAction as unknown as ProposedActionDraft;

  if (draft.kind === "STOCK") {
    const stockDraft = draft as ProposedStockDraft;
    const product = await findOrCreateProductByName(businessId, stockDraft.productName);
    const updatedProduct = await adjustStock(businessId, product.id, userId, {
      quantityDelta: stockDraft.quantityDelta,
      reason: stockDraft.reason,
      note: stockDraft.note,
    });
    const updatedMsg = await prisma.aiMessage.update({
      where: { id: message.id },
      data: { actionStatus: "CONFIRMED" },
    });
    return {
      message: mapAiMessageDto(updatedMsg),
      transaction: null,
      product: updatedProduct,
      customer: null,
      summary: await getFinancialSummary(businessId, "month"),
    };
  }

  if (draft.kind === "CUSTOMER_PAYMENT") {
    const payDraft = draft as ProposedCustomerPaymentDraft;
    const customer = await findCustomerByName(businessId, payDraft.customerName);
    if (!customer) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "No customer with that name was found");
    }
    const detail = await recordCustomerPayment(businessId, customer.id, {
      amount: payDraft.amount,
      paymentMethod: payDraft.paymentMethod,
      note: payDraft.note,
      idempotencyKey: input.idempotencyKey,
    });
    const updatedMsg = await prisma.aiMessage.update({
      where: { id: message.id },
      data: { actionStatus: "CONFIRMED" },
    });
    return {
      message: mapAiMessageDto(updatedMsg),
      transaction: null,
      product: null,
      customer: detail,
      summary: await getFinancialSummary(businessId, "month"),
    };
  }

  const baseDraft = draft as ProposedTransactionDraft;
  const merged: ProposedTransactionDraft = {
    ...baseDraft,
    ...(input.overrides ?? {}),
    kind: "TRANSACTION",
    currency: "ETB",
  };

  let productId: string | null = null;
  if (merged.productName) {
    const product = await findProductByName(businessId, merged.productName);
    productId = product?.id ?? null;
  }

  const createdTx = await createTransaction(businessId, userId, {
    type: merged.type,
    category: merged.category,
    amount: Number(merged.amount),
    description: merged.description,
    paymentMethod: merged.paymentMethod,
    counterpartyName: merged.counterpartyName ?? merged.customerName ?? null,
    productId,
    quantity: merged.quantity ?? null,
    transactionDate: merged.transactionDate,
    source: message.modality === "VOICE" ? "VOICE" : "CHAT",
    idempotencyKey: input.idempotencyKey,
  });

  const updatedMsg = await prisma.aiMessage.update({
    where: { id: message.id },
    data: {
      proposedAction: merged as unknown as Prisma.InputJsonValue,
      actionStatus: "CONFIRMED",
      linkedTransactionId: createdTx.id,
    },
  });

  const summary = await getFinancialSummary(businessId, "month");

  return {
    message: mapAiMessageDto(updatedMsg),
    transaction: createdTx,
    product: createdTx.productId ? await getProduct(businessId, createdTx.productId) : null,
    customer: createdTx.customerId ? await getCustomer(businessId, createdTx.customerId) : null,
    summary,
  };
}

export async function cancelProposedAction(
  businessId: string,
  messageId: string
): Promise<AiMessageDto> {
  const message = await prisma.aiMessage.findFirst({
    where: { id: messageId, businessId },
  });

  if (!message) {
    throw new AppError(404, "MESSAGE_NOT_FOUND", "Assistant message not found");
  }

  const updated = await prisma.aiMessage.update({
    where: { id: message.id },
    data: { actionStatus: "CANCELLED" },
  });

  return mapAiMessageDto(updated);
}

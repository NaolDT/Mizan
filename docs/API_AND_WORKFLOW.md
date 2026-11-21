# Mizan AI — Frozen API Specification & 2-Developer Workflow

## 1. Base URL & Authentication

- **Base URL**: `/api/v1`
- **Auth Transport**: `HttpOnly` cookie (`mizan_token`) **plus** `Authorization: Bearer <token>` header fallback.
- **Standard Envelope**:
  - Success: `{ success: true, data: T }`
  - Error: `{ success: false, error: { code: string, message: string, details?: unknown } }`

---

## 2. REST Endpoints

### Health
- `GET /api/v1/health` -> `{ status: "ok", timestamp, eatTime, services: { db, geminiConfigured, addisConfigured } }`

### Auth (`/api/v1/auth`)
- `POST /register` -> Body: `RegisterRequest` -> Returns `AuthResponse` (`{ token, user, business }`)
- `POST /login` -> Body: `LoginRequest` -> Returns `AuthResponse`
- `POST /demo` -> Provisions/logs into pre-seeded **Merkato Mini-Mart** demo merchant -> Returns `AuthResponse`
- `POST /logout` -> Clears `mizan_token` cookie -> `{ loggedOut: true }`
- `GET /me` -> Returns `{ user, business }`

### Business (`/api/v1/businesses`)
- `GET /current` -> Returns `BusinessDto`
- `PATCH /current` -> Body: `UpdateBusinessRequest` -> Returns `BusinessDto`

### Transactions (`/api/v1/transactions`)
- `GET /` -> Query: `range` (`today|week|month|all`), `type` (`INCOME|EXPENSE`), `category`, `paymentMethod`, `limit` -> Returns `{ items: TransactionDto[], totalCount: number }`
- `POST /` -> Body: `CreateTransactionRequest` (requires `idempotencyKey`) -> Returns `TransactionDto`
- `PATCH /:id` -> Body: `UpdateTransactionRequest` -> Returns `TransactionDto`
- `POST /:id/void` -> Marks transaction `VOIDED` -> Returns `TransactionDto`

### Analytics (`/api/v1/analytics`)
- `GET /summary?range=today|week|month` -> Returns `FinancialSummaryDto` (today KPIs, selected period KPIs, operating profit vs. inventory spend, period-over-period % delta, category breakdown, and daily cash-flow series)

### AI Assistant & Voice (`/api/v1/ai` & `/api/v1/voice`)
- `GET /ai/conversations/latest` -> Returns `{ conversation: ConversationDto, messages: AiMessageDto[] }`
- `POST /ai/chat` -> Body: `ChatRequest` (`{ message, language, conversationId?, speakReply? }`) -> Returns `AiTurnResponse`
- `POST /ai/messages/:messageId/confirm` -> Body: `ConfirmActionRequest` (`{ idempotencyKey, overrides? }`) -> Returns `{ message: AiMessageDto, transaction: TransactionDto, summary: FinancialSummaryDto }`
- `POST /ai/messages/:messageId/cancel` -> Marks draft `CANCELLED` -> Returns `{ message: AiMessageDto }`
- `POST /voice/interact` -> `multipart/form-data`: `audio` (Blob), `language` (`am|om|en`), `conversationId?` -> Runs STT -> Grounded AI -> TTS -> Returns `VoiceTurnResponse`
- `POST /voice/tts` -> Body: `{ text, language }` -> Returns `{ audioBase64, audioMimeType, provider }`

---

## 3. Two-Developer Git & Ownership Workflow

### Strict Directory Ownership
- **Developer 1 (Backend, DB, AI & Voice)**: Owns `server/**` and `server/prisma/**`. Branches: `feat/be-*`.
- **Developer 2 (Frontend, Dashboard, Voice Recorder & Localization)**: Owns `client/**`. Branches: `feat/fe-*`.
- **Shared Contract (`shared/**`)**: Locked in Phase 1. Any change requires a 2-minute sync and coordinated PR.

### 4 Integration Checkpoints
1. **Sync 1 (Hour 1.0)**: Monorepo, `shared`, Prisma schema, and shells merged to `main`.
2. **Sync 2 (Hour 3.0)**: Frontend Auth + Demo Shop button wired to live `/api/v1/auth/*`.
3. **Sync 3 (Hour 5.5)**: Dashboard KPIs, Charts & Quick Entry wired to live `/transactions` and `/analytics/summary`.
4. **Sync 4 (Hour 8.5)**: Voice Recorder & Confirmation Cards wired to live `/ai/*` and `/voice/*`.

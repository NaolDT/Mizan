# Mizan AI — System, Voice AI & Database Architecture

## 1. System Overview

Mizan AI uses a strictly decoupled three-package TypeScript monorepo (`shared`, `server`, `client`) backed by **PostgreSQL (Neon Serverless)** and **Prisma ORM**.

### Key Architectural Decisions
1. **PostgreSQL + Prisma over MongoDB**: Enforces `DECIMAL(12, 2)` monetary precision (zero IEEE-754 floating-point drift), foreign-key referential integrity, ACID ledger writes, and `UNIQUE(business_id, idempotency_key)` duplicate protection while retaining `JSONB` flexibility for AI draft payloads.
2. **100% Deterministic Financial Analytics**: LLMs never compute sums or percentages. `AnalyticsService` executes SQL aggregations anchored to `Africa/Addis_Ababa` (`UTC+3`) and injects a read-only JSON snapshot into the LLM prompt strictly for natural-language explanation.
3. **Safe Two-Step AI Mutation Gate**: Voice and text commands (`record_income`, `record_expense`) create a Zod-validated `proposed_action` stored on `ai_messages` (`action_status = 'PENDING_CONFIRMATION'`). Only an explicit `POST /api/v1/ai/messages/:id/confirm` call writes to `transactions`.

---

## 2. Multilingual Voice & AI Pipeline (`am`, `om`, `en`)

### Provider Matrix & Failover Hierarchy
- **Primary STT (`am`, `om`, `en`)**: **Addis Scribe API** (`POST https://api.addisassistant.com/api/v1/scribe/transcribe`, `backend=turbo`).
  - *Fallback 1*: **Gemini 3.8 Flash (`gemini-3.8-flash`)** inline multimodal audio input (extracts transcript + structured JSON intent in one pass for both Amharic and Afaan Oromo).
  - *Fallback 2*: `gemini-3.5-transcribe` (`am-ET` / `en-US`) or Browser `SpeechRecognition` (`am-ET` / `en-US`).
- **Primary Orchestrator LLM**: **Google Gemini 3.8 Flash (`gemini-3.8-flash`)** using strict `responseSchema` JSON structured output.
  - *Fallback*: `gemini-3.5-flash-lite` -> `Addis-Aleph-1` -> deterministic template responder.
- **Primary TTS (`am`, `om`, `en`)**: **Addis Voices 2 API** (`POST https://api.addisassistant.com/api/v1/voice/generations`, `am-hamen` for Amharic, `om-bikila` for Afaan Oromo).
  - *Fallback 1*: `gemini-3.8-flash-lite-tts` (`am` / `en`) or Browser `speechSynthesis` (`en`).
  - *Fallback 2*: Graceful silent fallback (`audioBase64: null`) preserving full UI confirmation flow.

### Dual-Text Number Normalization
Every structured AI response contains:
- `displayMessage`: Crisp UI text with formatted digits (`"2,500.00 ETB"`).
- `spokenMessage`: Numbers spelled out in words in the active language (`"ሁለት ሺህ አምስት መቶ ብር"` in Amharic; `"qarshii kuma lamaa fi dhibba shan"` in Afaan Oromo) so TTS engines never drop or misread digits.

---

## 3. Multi-Tenant 5-Table Database Schema

```text
[users] 1 ────────── * [businesses]
   │                        │
   │ 1                      ├──────────── * [transactions]
   │                        │                     ▲
   │                        │                     │ (0..1 linked_transaction_id)
   └──────── * [ai_conversations] 1 ───── * [ai_messages]
```

### Tenant Isolation Enforcement
- `requireTenant` middleware verifies `business.ownerId === req.user.id` and attaches `req.tenant = { userId, businessId }`.
- Every service/repository method takes `businessId` as its mandatory first parameter and filters `WHERE business_id = :businessId`.

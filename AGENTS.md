# AGENTS.md — Mizan AI Development Rules for Cursor

## 1. Core Architectural Mandates
- **Analyze First**: Always read existing files, `shared/src/types.ts`, and `server/prisma/schema.prisma` before modifying code. Do not invent undocumented requirements or duplicate existing utilities.
- **Strict Financial Determinism**: NEVER use an LLM to calculate sums, balances, profits, or percentages. All financial figures MUST be computed deterministically in PostgreSQL / TypeScript services (`Prisma.Decimal` arithmetic, zero float drift).
- **Safe AI Mutation Gate**: NEVER allow an LLM, tool call, or voice endpoint to insert, update, or delete rows in `transactions` directly. AI extraction may ONLY create a validated `proposed_action` draft (`action_status = 'PENDING_CONFIRMATION'`). Ledger writes happen exclusively via explicit user confirmation endpoints with an `idempotency_key`.
- **Mandatory Multi-Tenant Isolation**: Every database read and write on business data MUST filter by the server-verified `req.tenant.businessId` resolved from the authenticated session—NEVER accept `businessId` from client body params or LLM tool arguments.
- **Ethiopian Timezone Anchoring**: All relative date ranges (`today`, `yesterday`, `this week`, `this month`) MUST be computed against `Africa/Addis_Ababa` (`UTC+3`), never raw server UTC midnight.
- **Dual-Text TTS Safety**: Every AI response must produce both `displayMessage` (formatted ETB digits for UI) and `spokenMessage` (numbers spelled out as words in Amharic, Afaan Oromo, or English) so speech synthesis never drops or mispronounces financial amounts.

## 2. Two-Developer Ownership Boundaries
- **Developer 1 Scope**: `server/**` (including `server/prisma/**`).
- **Developer 2 Scope**: `client/**`.
- **Shared Contract**: `shared/**` contains frozen DTOs, enums, and API contracts agreed in Phase 1. Do NOT modify files outside your assigned developer directory or change `shared/**` without explicit developer coordination.

## 3. Security, Validation & Error Handling
- **Zero Secret Exposure**: Keep `GEMINI_API_KEY`, `ADDIS_API_KEY`, `DATABASE_URL`, and `JWT_SECRET` strictly in `server/.env`. Never expose provider keys in `client` (`VITE_*`).
- **Input Validation**: Validate every API request body, query param, and LLM JSON output with `zod` schemas. Reject invalid amounts (`<= 0` or `NaN`) and oversized audio uploads (`> 5MB`).
- **Graceful Voice Fallbacks**: Any STT, TTS, or LLM provider failure must degrade cleanly to fallback providers or text-only confirmation without crashing the request or losing the user's session.

## 4. Implementation & Quality Discipline
- **Incremental Delivery**: Implement one module/vertical slice at a time, verify TypeScript compilation (`npm run typecheck`), and test endpoints/components before moving to the next task.
- **Reusable Patterns**: Use shared UI primitives in `client/src/components/ui` and centralized API hooks in `client/src/hooks`. Preserve existing working functionality.
- **Change Reporting**: At the end of each task, list every created or modified file and summarize how it was verified.

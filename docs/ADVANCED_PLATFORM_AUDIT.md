# Mizan — Phase 0 audit and implementation plan

Inspected 24 Nov 2026 against the live repository. This is an audit, not a rebuild plan. No module from the advanced-platform brief has been implemented yet.

Stack as installed: React 19, Vite 6, Tailwind 4, TanStack Query 5, React Router 7, Recharts 2, Express 4, Prisma 6, PostgreSQL on Neon, Zod 3, TypeScript 5.7, Node ≥ 20. Hosting: Vercel client, Render API, Chapa (when `CHAPA_SECRET_KEY` is set), Gemini, Addis AI.

---

## 1. What Mizan is today

One shop per signed-in owner. The owner records money and stock by hand, by voice, by text, or by camera. The assistant proposes drafts. The ledger writes only after confirm, with an idempotency key. Totals are `Prisma.Decimal` in the server. The language model explains those totals. It does not add them.

The app is a single protected page (`/app`) with tabs: dashboard, ledger, inventory, customers, rewards, AI credits. Landing, auth, privacy, and terms are public.

---

## 2. Feature inventory

| Area | Status | Evidence |
|---|---|---|
| Auth (register, login, demo, JWT cookie + bearer) | Fully implemented | `auth.routes.ts`, bcrypt, production JWT guard |
| One-shop tenant isolation | Fully implemented | `requireTenant` loads the owned business; queries filter `businessId` |
| Manual income/expense, edit, void, CSV | Fully implemented | `transactions` unique `(businessId, idempotencyKey)` |
| Addis Ababa date windows | Fully implemented | `eatDate.ts` |
| Inventory CRUD, stock movements, photos, barcodes, price history | Fully implemented | `Product`, `StockMovement`, `ProductPriceHistory` |
| Camera match + confirm sale/purchase | Fully implemented | Vision module; catalog price is source of truth |
| Customers + outstanding from ledger | Fully implemented | `CustomerLedger` CREDIT_SALE / PAYMENT / REVERSAL |
| Dashboard KPIs, charts, insights strip | Fully implemented | Deterministic `getFinancialSummary` / `getBusinessInsights` |
| Payment-method till (cash / Telebirr / bank / credit) | Fully implemented | `byPaymentMethod` on the summary |
| Voice + text assistant with confirm/cancel | Fully implemented | Last 8 messages + business snapshot in the prompt |
| Dual-text TTS (digits vs spoken words) | Fully implemented | `spokenMessage` |
| Voice/STT/LLM provider fallback | Fully implemented | Addis → Gemini → text |
| Plans, AI credit wallet, ledger, top-ups | Fully implemented | Credit lots + expiry + 402 gate |
| Chapa checkout + verify + webhook | Fully implemented, not proven live | Needs `CHAPA_SECRET_KEY` on Render |
| Insufficient-credit UX | Fully implemented | Header pill + CreditGate |
| Platform referral rewards | Fully implemented | Separate from shop customer loyalty |
| Low-stock flag | Partial | `lowStockThreshold` + insight; no days-until-out |
| Product profitability / slow movers | Partial | Period SQL; no forecast |
| Conversation follow-up (“that product”) | Partial | 8 prior lines, no stored entity focus |
| Cash vs revenue | Partial | Till split exists; income still includes credit sales |
| UserRole ADMIN | Unused | Enum only; every shop user is OWNER |
| Password reset / email | Not implemented | |
| Supplier records, POs, receiving | Not implemented | Supplier is a free-text name on a purchase |
| POS cart / receipts / split tender | Not implemented | Camera + manual line, not a till |
| Employees, RBAC, audit log | Not implemented | Tenant is `ownerId` only |
| Branches / stock transfers | Not implemented | One business row per owner |
| Offline / PWA / sync queue | Not implemented | No service worker, no IndexedDB |
| Ethiopian calendar, VAT engine | Not implemented | Gregorian + EAT only |
| PDF/Excel reports | Not implemented | CSV for the ledger only |
| Background monitoring / push | Not implemented | `setInterval` credit expiry only; Render free sleeps |
| Telebirr / CBE as gateways | Not implemented | Labels on transactions only |
| Admin UI for plans | Not implemented | Header-key API only |
| Prisma migrations | Not implemented | Schema is applied with `db push` |
| Automated tests beyond billing math | Not implemented | One file: `credit.policy.test.ts` |

---

## 3. Architecture that must be preserved

These are working and must not be replaced:

1. **Decimal ledger.** `DECIMAL(12,2)` + `Prisma.Decimal`. No LLM math.
2. **Confirm gate.** AI and camera write `PENDING_CONFIRMATION` drafts. `POST .../confirm` with `idempotencyKey` is the only AI path into `transactions`.
3. **Server-verified tenant.** `req.tenant.businessId` from the session. Ignore body/LLM `businessId`.
4. **Historical sale amounts.** Transaction amount is stored on the row. Catalog price changes do not rewrite it.
5. **Credit wallet.** Lots + ledger + expiry-first spend + refund on provider failure.
6. **Chapa verify-then-fulfill.** Return URL is not proof of payment.
7. **Manual bookkeeping without AI credits.**
8. **Emerald/slate UI and the Mizan name.**

---

## 4. Architectural limits (do not ignore)

### 4.1 One owner, one effective shop

`requireTenant` picks the oldest business owned by the user (or `x-business-id` if that owner owns it). There is no membership table. Employees and branches cannot be added by tacking `branchId` onto client requests. They need `BusinessMembership` (user, business, role) and, later, `Branch` under a business. Until then, keep one shop.

### 4.2 Income is accrual-style

A credit sale is `type=INCOME` with `paymentMethod=CREDIT`. It raises “income” and “profit” and also raises customer outstanding. That is consistent internally, but a shopkeeper asking “how much cash do I have?” will be misled if we only show income. Cash collected = income where method is CASH/TELEBIRR/BANK, plus customer PAYMENT ledger lines. Do not invent a second ledger. Derive cash from the existing rows.

### 4.3 AI is snapshot + JSON, not tools

Each turn sends a bounded snapshot (`buildAiContextSnapshot`) plus eight messages. Gemini returns Zod-validated JSON. That is enough for “how much did I sell” and a draft sale. It is weak for “when will cooking oil run out?” unless days-until-out is computed in TypeScript and placed in the snapshot. Do not add LangChain or a generic agent runner. Add named backend tools (summary, profitability, stock forecast, advisor report) and optionally Gemini function calling later.

### 4.4 Schema changes use `db push`

Production has been updated with `prisma db push`. There is no `prisma/migrations` history. Before employee/branch/supplier tables, introduce `prisma migrate` on a copy of production, then freeze push for live.

### 4.5 Render free plan sleeps

A monitoring agent that runs “every hour” inside `setInterval` will not run while the service is asleep. Phase 2 notifications should be computed on dashboard/wallet load (and later an external cron) rather than trusting an in-process loop.

### 4.6 Tests are thin

Only credit spend-order tests exist. New financial formulas (cash collected, days of stock) need tests in the same style before they ship.

### 4.7 UI will not scale as more tabs

Fourteen modules cannot live as header links on one page. Phase 1 can still live on `/app`. Phase 3+ (POS, suppliers, employees) needs routes such as `/app/inventory`, `/app/pos`, with the current tabs as the first group.

---

## 5. Mapping requested modules onto the current code

| Requested module | Fit | First move |
|---|---|---|
| 1. AI Business Advisor | Improve existing | New `advisor` service over `getFinancialSummary`, insights, profitability. New intent `business_advice` already exists but is generic. Structured report DTO + UI section. |
| 2. Predictive inventory | Improve existing | Compute sell-through from `StockMovement` SALE + `Transaction` quantity. Days remaining = on-hand / recent daily rate, with a minimum sample and an “uncertain” band. No ML. |
| 3. Cash flow intelligence | Improve existing | Derive cash in, digital in, credit sales, collections from current tables. No new money table. Supplier payables wait for Module 6. |
| 4. Conversational voice | Improve existing | Keep Addis/Gemini. Put focused product/customer from the last turn into context. Do not silently confirm. |
| 5. Proactive monitoring | New, after 1–2 | Generate notices from the same rules as insights, store in `BillingNotice`-like `BusinessNotice`, show on dashboard. Dedupe by kind+entity+day (EAT). |
| 6. Suppliers and POs | New schema | `Supplier`, `PurchaseOrder`, `PurchaseReceipt`. Stock rises only on confirmed receive. |
| 7. Customer intelligence | Improve existing | History and spend from `transactions` + `customerLedger`. Loyalty is a separate shop-level ledger, not platform referrals. |
| 8. POS | New UI on existing services | Cart that calls `createTransaction` / vision confirm-sale. No second math engine. Split payments need a schema change (two methods per sale) — defer split tender. |
| 9. Employees | Architectural change | Membership + RBAC middleware. `UserRole` OWNER/ADMIN is not enough. |
| 10. Multi-branch | Architectural change | After employees. Branch-scoped stock. |
| 11. Offline-first | New client architecture | PWA + IndexedDB queue with existing idempotency keys. AI stays online-only. |
| 12. Ethiopian BI | Additive | Ethiopian calendar display first. VAT only as configurable rates, no filing claim. |
| 13. AI report generation | After advisor | PDF/Excel later; CSV exists. Figures from advisor/summary APIs. |
| 14. Pricing advisor | After inventory intelligence | Margin = selling − cost from catalog + history. Recommendation only. |

---

## 6. Security and reliability notes (current)

Already in place: hashed passwords, httpOnly cookie, production JWT refusal of published secrets, tenant filter, Zod on bodies, multer size limits, rate limit 150/min, Chapa HMAC + verify, no `VITE_` provider keys.

Gaps, in order of severity:

1. **No password reset.** Lost password is a support event.
2. **`trust proxy = 1` plus spoofable `X-Forwarded-For`** can weaken the rate limit behind some proxies. Revisit after seeing Render/Vercel hop count.
3. **No CSRF token.** Cookie + `SameSite=Lax` + CORS origin list is the current control. Keep it when adding more cookie-authenticated POST forms.
4. **Prompt injection.** The model cannot write the ledger, but it can still produce a misleading draft. Keep confirm UI. Do not add a “run SQL” tool.
5. **`UserRole.ADMIN` unused.** Do not treat it as staff RBAC.
6. **Billing admin is a shared header key**, not per-user. Fine until there is a real ops console.
7. **No audit log** of who voided or changed a price (only `recordedById` on some rows).

---

## 7. Recommended implementation order

Priorities: shop-owner usefulness, reuse of current tables, no new paid APIs, no tenant redesign until needed.

### Phase 1 — Intelligence on what you already store (approve this first)

Business value: the owner can see cash vs credit, ask “how is my shop doing?”, and get a grounded weekly/monthly briefing.

1. **Cash flow DTO** from existing `transactions` + `customerLedger` (cash/Telebirr/bank in, credit sales, collections, expenses by method, outstanding). Tests for “credit sale is not cash”.
2. **Advisor report API** `GET /api/v1/analytics/advisor?range=` assembling summary, till, insights, top/slow products, low stock. Numbers from services already in `analytics.service.ts` / `inventory.service.ts`. Optional short Gemini explanation that receives that JSON only.
3. **Dashboard “Advisor” block** using that API (not a new chatbot).
4. **Richer assistant context**: include cash-flow snapshot + last referenced product/customer ids parsed from prior drafts. Keep eight-message window. Keep confirm gate.
5. **Days-of-stock field** on profitability (simple rate from the selected range). Uncertain if fewer than N sale days.

No new Prisma models required except optionally `BusinessNotice` if we persist advisor alerts. Prefer computing on read in Phase 1.

Do **not** in Phase 1: suppliers, POS cart, employees, branches, offline, Ethiopian calendar, PDF, new payment providers, new npm agent frameworks.

### Phase 2 — Predictive inventory and quiet monitoring

Persist notices, days-until-out, reorder suggestion, dashboard alerts, assistant “when will it run out”. Compute on request plus on `/app` load. External cron only if Render paid/cron exists.

### Phase 3 — Operations

Suppliers + receive-then-stock. Customer spend/loyalty (shop-level). POS cart on current transaction service. Still one branch, one owner.

### Phase 4 — People and places

Membership, roles, audit log, then branches. This is the first phase that changes tenant shape.

### Phase 5 — Access

PWA shell, offline manual sales queue (idempotency keys), Ethiopian date display.

### Phase 6 — Commercial hardening

Prisma migrate, PDF/Excel, pricing advisor, Chapa live verification, observability, expand tests, password reset.

---

## 8. Phase 1 data and API sketch (for approval)

No new tables if possible.

```
GET /api/v1/analytics/cash-flow?range=today|week|month
  cashIn, telebirrIn, bankIn, creditSales, collections,
  cashOut, telebirrOut, bankOut, outstanding, netCashMovement

GET /api/v1/analytics/advisor?range=...&language=am|om|en
  overview, positives[], problems[], actions[],
  metrics { ...from cash-flow + summary + valuation },
  products { best, slow, lowStock, daysOfCover[] },
  dataSufficient: boolean
```

Assistant: extend snapshot with `cashFlow` and `productCover`. New structured fields only if Zod already has a place; otherwise `business_advice` fills display/spoken from the advisor JSON computed in TypeScript **before** the model writes prose.

UI: keep `/app`. Add an Advisor card and a cash-position row under the till. No new design system.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Credit sales counted as cash by owners | Separate cash-flow API; copy that says credit is owed, not in the drawer |
| Gemini invents “run out in 3 days” | Days-of-cover is SQL/TS; model only restates the number |
| Scope explosion | One phase at a time; Phase 1 has no membership/POS/offline |
| `db push` vs migrate | Do not add large schema in Phase 1; adopt migrate in Phase 6 or at start of Phase 3 |
| Render sleep | No “hourly agent” in Phase 1–2 without a wake mechanism |
| Two credit systems (platform vs shop loyalty) | Keep `RewardLedger` for Mizan invites; shop loyalty is a later table |

---

## 10. Decision requested

Approve **Phase 1 only**: cash-flow intelligence, advisor report API + dashboard block, richer assistant snapshot, days-of-stock on existing profitability.

After that ships, Phase 2 (forecast + notices) is the natural next step.

Do not start Modules 6–14 until Phase 1 is in the product and the existing ledger, camera, wallet, and confirm gate still pass a smoke check.

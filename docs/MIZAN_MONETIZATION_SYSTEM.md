# Mizan hybrid monetization

This document describes the billing system that is actually in the codebase. Prices below are the seed catalog. After the first boot, the database rows are the source of truth and are not overwritten.

## What already existed

Mizan already had one subscription model:

- `Business.plan` is `FREE`, `STARTER`, `PRO` or `BUSINESS`.
- Spoken replies are metered on the business row (`voiceRepliesUsed`, `voiceBonusReplies`) per Africa/Addis_Ababa month.
- Seed prices live in `server/src/config/plans.ts`: Free 0 ETB / 5 replies, Starter 99 / 25, Pro 199 / 70, Business 399 / 150. A 10-reply voice pack is 30 ETB.
- Plan changes and the voice pack run only when `ALLOW_MANUAL_BILLING` is on. Production defaults that to off, so those buttons return "payment is not connected".
- Reward points and referrals are a separate ledger (`RewardLedger`). They grant points, a discount, a starter trial or bonus replies. They are not AI credits.
- Text chat, camera and receipt scans were not metered.
- There was no payment provider.

That subscription model is still the plan identity. This work does not add a second plan enum.

## Business model now

Three ways to use AI:

1. **Free.** Every shop receives the Free plan's monthly AI credits (seed: 20). They reset on the first day of the next month in Africa/Addis_Ababa and unused ones expire then. Dashboards, manual transactions, inventory and customers do not spend credits.
2. **Monthly plan.** A verified payment sets `plan` and `planPaidUntil` to one Addis month from the payment (or extends that date when the same plan is renewed early). The plan's credit allowance is granted once for that payment and expires at `planPaidUntil`. A comped plan with no payment window (the old manual plan change) still receives its monthly credits.
3. **Top-up.** A verified payment adds purchased credits that last for the package's validity (seed: 90 or 120 days). They are not deleted when a subscription ends.

Spoken replies still use the existing monthly reply allowance as well as TTS credits. A shop needs both a remaining reply and enough credits to hear a reply. Text, voice questions, camera and receipt scans use credits only.

Seed top-ups cost more per credit than the Business plan: 50 ETB / 40, 100 / 90, 250 / 240, 500 / 520. The wallet computes ETB per credit and the savings percent from the live rows, not from these sentences.

## Credit wallet

Tables: `credit_lots`, `credit_ledger_entries`, `credit_draws`, `ai_usage_records`, `billing_notices`.

Each lot has a source: `SUBSCRIPTION`, `PURCHASED`, `REFERRAL`, `PROMO` or `ADMIN`. The balance is the sum of `remaining` on unexpired lots. A balance never changes without a ledger row.

Spend order is in `credit.policy.ts`: soonest expiry first, then promotional, referral, subscription, purchased, admin. Lots are locked with `SELECT … FOR UPDATE` inside one database transaction, so two requests cannot overspend.

AI features call `reserveAndRun` only:

| Feature | Seed cost | Where |
|---|---:|---|
| Text assistant | 1 | `POST /api/v1/ai/chat` |
| Voice question | 2 | `POST /api/v1/voice/interact` |
| Spoken reply | 1 | metered TTS |
| Camera | 2 | `POST /api/v1/vision/analyze` |
| Receipt scan | 3 | same route when the workflow is `SCAN_RECEIPT` |

Costs are rows in `ai_credit_prices`. A cost of 0 means that feature is free. Confirming a draft, viewing insights, and editing products do not call this service. Insights stay deterministic SQL.

Flow: expire due lots, grant the free or trial allowance if needed, check the plan allows the feature, reserve the configured credits, run the provider, mark the usage settled. If the provider throws, or TTS produces no audio, the same lots are restored and a `REFUND` ledger row is written. A reservation that never reaches the provider (not enough credits) returns HTTP 402 `INSUFFICIENT_CREDITS` and does not call the model.

Duplicate grants are blocked by a unique key of business, source and period key (`free:YYYY-MM`, `payment:<id>`, `referral:<id>:referrer`, and so on).

## Payments

`billing_payments` is the only payment record. The amount, currency and credits are copied from the catalog when checkout starts. The browser never supplies the amount.

Providers implement the same steps: start checkout, verify, fulfill once.

- **Chapa**, official Accept Payment API from [developer.chapa.co](https://developer.chapa.co/integrations/accept-payments): `POST https://api.chapa.co/v1/transaction/initialize` and `GET https://api.chapa.co/v1/transaction/verify/<tx_ref>` with `Authorization: Bearer CHAPA_SECRET_KEY`. Currency is ETB. The callback is `PUBLIC_API_URL/api/v1/billing/payments/chapa/callback`. The return URL is the client `/app?billing=return&txRef=`. Credits are granted only after verify reports `success`, the `tx_ref` matches, the currency is ETB, and the amount matches to two decimal places. The return page is not proof of payment.
- **Webhook** `POST /api/v1/billing/payments/chapa/webhook`. If `x-chapa-signature` or `chapa-signature` is present it must equal HMAC-SHA256 (hex) of the raw body using `CHAPA_WEBHOOK_SECRET`, or the secret key when no separate webhook secret is set. A bad signature is rejected. The handler still verifies with the Chapa API before fulfilling. Chapa's own webhook example does not document a signature; the verify call is the check that grants credits.
- **Test provider** `DEV` exists only when `NODE_ENV` is not `production`. Checkout opens the wallet with buttons for paid, failed, cancelled and pending. Those buttons call the simulate route, which refuses a non-DEV payment and refuses to run in production.

Fulfillment claims the payment with `updateMany` where status is still unpaid, then writes the plan or the credit lot in the same transaction. A repeated callback finds the payment already `PAID` and does not grant again.

There is no Chapa recurring-subscription API in this integration. Each month of a paid plan is a new checkout. Cancellation sets `cancelPlanAtPeriodEnd`. Access and already granted credits stay until `planPaidUntil`. A sweeper then sets the plan back to Free. Shop records are not deleted. Purchased credits stay until their own expiry.

Telebirr and CBE are not implemented. Adding one means a new provider behind `initiateProvider` / `verifyProvider` without changing the wallet.

## Referrals and promotions

When an existing referral qualifies, the referrer and the new shop also receive AI credits (seed: 30 and 15, valid 60 days) from `billing_settings`. The old point rewards still run. Self-referral is impossible because the two owners differ, and the existing referral cap still applies before credits are granted.

The `welcome` promotion is seeded inactive. An admin can turn it on. It grants once per business.

## Customer API

All of these use the session business. A client `businessId` is ignored.

- `GET /api/v1/billing/wallet`
- `POST /api/v1/billing/checkout`
- `POST /api/v1/billing/payments/:txRef/verify`
- `GET /api/v1/billing/payments`
- `POST /api/v1/billing/subscription/cancel`
- `POST /api/v1/billing/notices/read`
- `POST /api/v1/billing/payments/dev/simulate` (non-production only)

Chapa callback and webhook are public and do not trust the caller for the amount.

The app tab **AI Credits** shows the split balance, packages, plans, ETB per credit, the savings line, a top-up suggestion when this month's top-up spend reaches 70% of a plan price, credit prices, and the ledger. Copy is in English, Amharic and Afaan Oromo.

## Admin API

`/api/v1/billing/admin/*` requires header `x-mizan-admin-key` equal to `BILLING_ADMIN_KEY` (at least 24 characters). If the variable is empty the routes stay off. The key is never sent to the client and there is no admin screen, because a shop owner must not edit global prices.

The routes edit the four plans, create and edit top-up packages, edit feature prices and the welcome promotion, grant or debit a wallet (always with a ledger row and an idempotency key), and return payment and usage totals. New plan codes still need a schema change because `Business.plan` is a fixed enum. Prices, credits, feature flags and limits do not.

`productLimit` and `customerLimit` are null in the seed, so nobody is blocked. Setting a number caps new products or customers. It does not hide existing ones.

## Production configuration

Set on the API host, not in the client:

- `PUBLIC_API_URL` — the Render origin, no trailing slash. Already set in `render.yaml` to `https://mizan-vwqy.onrender.com`.
- `CHAPA_SECRET_KEY` — from the Chapa dashboard. Test keys and live keys must match the Chapa account mode.
- `CHAPA_WEBHOOK_SECRET` — optional. Used only to check webhook signatures.
- `CHAPA_BASE_URL` — defaults to `https://api.chapa.co/v1`.
- `BILLING_ADMIN_KEY` — long random string.
- `CLIENT_ORIGIN` — the Vercel origin, already required for login. The Chapa return URL uses it.

Register the webhook URL in the Chapa dashboard: `https://mizan-vwqy.onrender.com/api/v1/billing/payments/chapa/webhook`.

Until `CHAPA_SECRET_KEY` is set, the wallet shows no payment button and explains that online payment is not set up. Free monthly credits still work. The old manual plan buttons stay disabled in production.

## What was verified

`credit.policy.test.ts` covers spend order, a split draw, decimal ETB-per-credit, the savings percent, and Chapa amount parsing (`"100"`, `100`, and a rejected `"100.001"`).

The schema is additive. Apply it with `npm run db:push` before starting the server that contains this code.

## Not in this version

- Telebirr, CBE Birr, and bank transfer.
- Chapa refunds and Chapa recurring billing. AI-failure refunds are credit ledger refunds only.
- Per-token or per-second prices. Costs are per feature.
- A platform admin UI.
- Email or SMS. Notices are in the wallet.
- Automatic card renewal. The shop pays again each period.
- Replacing the spoken-reply counter. It still caps TTS alongside credits.

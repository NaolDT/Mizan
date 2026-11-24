# Mizan — Project Overview

The product name is **Mizan**. “Mizan AI” is the technical and page title (`Mizan AI | Your Intelligent Business Assistant`). This document describes the software as it is built. Deeper notes live in the linked documents at the end.

## Objective

Give an Ethiopian small business one place to keep its daily books and ask questions about them in the language the owner actually speaks.

The owner should be able to record a sale or an expense by typing, speaking, or photographing, then see profit, stock, and money owed without doing the arithmetic by hand. The software must stay accurate with money, keep one shop’s data away from another shop, and not write a ledger entry until the owner confirms it.

## Problem

Many shopkeepers, traders, cafés, and informal businesses in Ethiopia record the day in a notebook, on paper receipts, or from memory. That makes it hard to answer ordinary questions: what came in today, what went out, what is still owed, and what is left on the shelf.

A few things make ordinary bookkeeping software a poor fit:

- The working languages are Amharic and Afaan Oromo as well as English.
- The owner is often at the counter, so typing every line is slow.
- A sale may be cash, Telebirr, bank, or credit.
- Prices and stock change, and a later price change must not rewrite yesterday’s sale.
- An assistant that invents an amount, or that saves a transaction the owner did not approve, would make the books worse.

## Solution

Mizan is a web app for one shop per account. The owner signs in, then uses a dashboard for records, inventory, customers, rewards, and AI credits.

Three ways reach the same books:

- **Text.** The owner types in Amharic, Afaan Oromo, or English. The assistant proposes a draft. The owner confirms it.
- **Voice.** Speech is transcribed, the same assistant answers, and a spoken reply can be played back. Numbers in speech are spelled out so the voice engine does not drop digits.
- **Camera.** A photo is matched to the shop’s own product list by barcode, then by name. The selling price comes from the catalog. The owner reviews the lines and confirms the sale or the purchase.

Money totals, profit, stock value, and customer balances are calculated in the database and in TypeScript with exact decimal arithmetic. The language model explains those figures. It does not add them up.

## Features

### Accounts and the shop

- Register and sign in with phone or email and a password.
- A demo shop, Merkato Mini-Mart, can be opened without creating an account.
- One business profile: name, category, location, currency (ETB), and preferred language.
- Session is an HTTP-only cookie, with a bearer token as a fallback.

### Ledger

- Income and expense, entered by hand or confirmed from the assistant or the camera.
- Categories such as sales, transport, rent, utilities, salary, and inventory purchase.
- Payment methods: cash, Telebirr, bank, and credit. Telebirr here is a label on the transaction, not a payment-gateway integration.
- Edit a transaction and void it. A void is kept in the record rather than silently deleted.
- Export the ledger as CSV.
- “Today”, “this week”, and “this month” use Africa/Addis_Ababa, not the server’s UTC midnight.

### Inventory

- Products with name, brand, size, barcode, unit, quantity, cost, and selling price.
- Stock movements for restock, sale, and manual adjustment.
- Price history, so an old sale keeps the amount that was charged.
- Optional product photo, stored for that shop only.
- Low stock is visible from the quantity on hand.

### Customers and credit

- Customer name, phone, and notes.
- A credit sale increases what the customer owes. A payment reduces it.
- Outstanding balances are summed from the customer ledger, not typed in as a free-form total.

### Insights

- Income, expense, and net for the selected range.
- Category breakdown.
- Short warnings drawn from stored data, such as money still owed or a product that sold the most. These are computed from the shop’s rows.

### Assistant

The assistant can propose or answer:

- Record income or expense.
- Confirm or cancel a pending draft.
- Summarize finances, expenses, or recent transactions.
- Ask about stock, adjust stock, ask what a customer owes, or record a customer payment.
- Ask a clarifying question when the amount or the product is unclear.

Confirming a draft is a separate request with an idempotency key, so a double tap does not create two transactions.

### Camera

- Take or upload a photo. The client compresses it. Live barcode detection runs in the browser when the device supports it.
- The server matches a barcode exactly, then a product name, against that shop’s catalog.
- Unmatched lines can be recorded as an amount only, without a product.
- A new product can be registered from the review screen.
- The model is not asked to invent a price.

### Rewards

- Points for early use and for a 7-day recording streak.
- An invite code. A referral counts only after the new shop records enough real transactions inside a time window, and a referrer cannot qualify an unlimited number of shops.
- Points can be exchanged for extra spoken replies, a discount on the next manual plan change, or a short Starter trial.

### Plans and AI credits

Viewing the dashboard, the ledger, inventory, and customers does not spend AI credits. Manual entry does not either.

AI use does. The seeded costs are 1 credit for a text turn, 2 for a voice question, 1 for a spoken reply, 2 for a camera look-up, and 3 for a receipt scan. Spoken replies also still count against the monthly reply allowance.

| Plan | Monthly price | Monthly AI credits | Spoken replies / month |
|---|---:|---:|---:|
| Free | 0 ETB | 20 | 5 |
| Starter | 99 ETB | 120 | 25 |
| Pro | 199 ETB | 350 | 70 |
| Business | 399 ETB | 900 | 150 |

Top-up packs (50, 100, 250, and 500 ETB) buy credits without a subscription. They cost more per credit than a monthly plan. Prices and credit amounts are stored in the database and can be changed by an admin without a code edit. The four plan names themselves are fixed in the schema.

Checkout goes through Chapa when `CHAPA_SECRET_KEY` is set. Credits are added only after the server verifies the payment with Chapa. A test payment button exists only when the API is not running in production. Telebirr and bank transfer are not payment gateways in this version. A paid plan lasts one month per checkout. It does not renew by itself.

## Business logic

These rules are enforced in the server, not only in the screen.

1. **The owner confirms ledger writes.** The assistant and the camera create a draft. `transactions` changes only on the confirm endpoint, and that call carries an idempotency key.
2. **Money is decimal.** Amounts use `DECIMAL(12,2)` and `Prisma.Decimal`. Totals and percentages are not left to the language model and are not computed with binary floating point.
3. **One shop cannot read another shop.** After sign-in, the server loads the business that belongs to that user. Later queries filter on that business id. A business id sent by the browser or by the model is not trusted.
4. **Dates follow Addis Ababa.** Relative ranges and the monthly credit period use `UTC+3`. Ethiopia does not observe daylight saving in this implementation.
5. **Catalog price wins.** A camera sale uses the product’s selling price. A manual override is stored as an override. Changing the catalog price later does not change completed transactions.
6. **Stock and credit stay in ledgers.** A sale can reduce quantity and append a stock movement. A credit sale or a customer payment appends a customer-ledger line. The balance shown is the sum of those lines.
7. **AI credits are a ledger too.** Each grant, spend, expiry, and refund is a row. Spending takes credits that expire sooner first. A failed model call returns the credit. The same payment cannot grant credits twice.
8. **Voice has a second meter.** A spoken reply needs both a remaining monthly reply and enough AI credits. If the voice provider returns no audio, the reply and the credit are given back.
9. **Invalid input is rejected.** Amounts must be greater than zero. Audio and photos over the size limit are refused. Request bodies are checked with Zod.

## Technology stack

The repository is an npm workspace with three packages.

| Package | Role | Main pieces |
|---|---|---|
| `shared` | API contracts | TypeScript types shared by the client and the server |
| `server` | API | Node.js, Express, Prisma, PostgreSQL, Zod |
| `client` | Web app | React 19, Vite 6, Tailwind CSS 4, TanStack Query, React Router, Recharts |

Other server libraries: JWT and cookie sessions, bcrypt for passwords, Multer for audio and image uploads, and `express-rate-limit`.

External services, all optional at boot except the database:

| Service | Use |
|---|---|
| PostgreSQL (Neon in the hosted setup) | System of record |
| Google Gemini | Assistant JSON, camera understanding, speech fallback |
| Addis AI | Amharic and Afaan Oromo speech-to-text and speech synthesis |
| Chapa | Card and local checkout for plans and top-ups, when configured |

Hosted layout:

- Database on Neon.
- API on Render (`render.yaml`), region Frankfurt.
- Web app on Vercel. The browser calls `/api` on the Vercel domain, and Vercel forwards that to Render, so the login cookie stays on one site.

Local development is `npm run dev`: the API on port 4000 and the client on port 5173, with the client proxying `/api` to the API.

## Other software aspects

### Security

- Passwords are hashed. The JWT secret must be a private value. In production the process exits if the secret is still a published example.
- Provider keys (`GEMINI_API_KEY`, `ADDIS_API_KEY`, `CHAPA_SECRET_KEY`, `DATABASE_URL`, `JWT_SECRET`) stay in the server environment. They are not `VITE_` variables.
- The billing admin API is off unless `BILLING_ADMIN_KEY` is set. It is not a page inside a shop account.
- Chapa payments are verified on the server. The return page is not treated as proof of payment.
- API routes are rate-limited. Uploads are size-limited.

### Languages

The interface, the assistant, and speech are written for Amharic, Afaan Oromo, and English. The landing page copy is kept in all three. Each assistant reply has a display sentence (digits for the screen) and a spoken sentence (amounts as words).

### Reliability

If speech-to-text, speech synthesis, or the language model fails, the request falls back to another provider or to text. The session is not discarded. A provider failure during speech does not keep the charge for a reply that was never produced.

### Repository layout

```text
Mizan/
├── shared/          API types
├── server/          Express API and Prisma schema
├── client/          React app and landing page
├── docs/            Deployment, billing, camera, and this overview
├── render.yaml      Render API service
└── AGENTS.md        Rules for changing the code
```

### What this version does not include

- A direct Telebirr or CBE payment integration. Chapa is the checkout provider.
- Automatic monthly card renewal. Each paid month is a new checkout.
- Email or SMS billing notices. Notices appear in the AI Credits tab.
- A visual admin console. Plan and package edits go through the admin API.
- Per-token pricing. AI features have a credit cost each, stored in the database.
- More than the four named plans without a schema change.

## Where to read next

| Topic | Document |
|---|---|
| Deploying to Neon, Render, and Vercel | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Credits, plans, top-ups, and Chapa | [MIZAN_MONETIZATION_SYSTEM.md](./MIZAN_MONETIZATION_SYSTEM.md) |
| Camera matching and price rules | [MIZAN_VISION_CAMERA_IMPLEMENTATION_PLAN.md](./MIZAN_VISION_CAMERA_IMPLEMENTATION_PLAN.md) |
| Earlier API and voice notes | [API_AND_WORKFLOW.md](./API_AND_WORKFLOW.md), [ARCHITECTURE_AND_DB.md](./ARCHITECTURE_AND_DB.md) |

The architecture note still describes an early five-table sketch. The live schema also has customers, inventory, rewards, camera hints, and billing. Trust `server/prisma/schema.prisma` and this overview for the current shape.

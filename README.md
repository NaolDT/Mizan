# Mizan AI

**Voice-First AI Financial & Business Management Assistant for Ethiopian Small Businesses**

Mizan AI helps Ethiopian shopkeepers, traders, cafes, and micro-merchants record daily income and expenses, understand true net profit, and get grounded business insights using natural voice and chat in **Amharic (`አማርኛ`)**, **Afaan Oromo (`Afaan Oromoo`)**, and **English**.

The general overview — objective, problem, solution, features, business rules, and stack — is in [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md).

---

## Monorepo Structure

```text
mizan-ai/
├── AGENTS.md                     # Mandatory Cursor Agent development & safety rules
├── docs/
│   ├── MIZAN AI.pdf              # Original 63-page Product & Business Specification
│   ├── ARCHITECTURE_AND_DB.md    # System, Voice AI & 5-Table PostgreSQL/Prisma Design
│   └── API_AND_WORKFLOW.md       # Frozen REST Contracts & 2-Developer Git Workflow
├── shared/                       # Shared TypeScript DTOs, Enums & API Contracts
├── server/                       # Dev 1: Express + TypeScript + Prisma + Gemini + Addis AI
│   └── prisma/
│       ├── schema.prisma         # Multi-tenant PostgreSQL schema (DECIMAL(12,2) ledger)
│       └── seed.ts               # Merkato Mini-Mart demo merchant seed
└── client/                       # Dev 2: React 19 + Vite + Tailwind + TanStack Query + Recharts
```

---

## Quick Start

### 1. Prerequisites
- **Node.js** `>= 20.x`
- **PostgreSQL** connection URL (e.g., [Neon Serverless Free Tier](https://neon.tech) or Supabase)
- **Google Gemini API Key** ([Google AI Studio Free Tier](https://aistudio.google.com/apikey))
- **Addis AI API Key** ([Addis AI Platform](https://addisassistant.com) — includes 500 ETB free starter credit for Amharic & Afaan Oromo STT/TTS)

### 2. Configure Environment Variables

Copy the example environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, and `ADDIS_API_KEY` inside `server/.env`.

### 3. Install, Push Schema & Seed Demo Merchant

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start Development Servers

```bash
npm run dev
```

- **Frontend (`client`)**: `http://localhost:5173` (proxies `/api` to `http://localhost:4000`)
- **Backend (`server`)**: `http://localhost:4000/api/v1/health`

---

## Deployment

The API deploys to Render from `render.yaml`, the web app to Vercel from `client/vercel.json`, and the database stays on Neon. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) step by step.

---

## Safety & Financial Integrity Guarantees
1. **Zero LLM Math**: All KPIs, balances, category breakdowns, and period comparisons are computed in PostgreSQL / TypeScript using exact `Decimal(12,2)` arithmetic.
2. **Two-Step Confirmation Gate**: AI and Voice interactions never mutate `transactions` directly—they produce validated `PENDING_CONFIRMATION` drafts requiring explicit user confirmation with an `idempotency_key`.
3. **Strict Multi-Tenant Isolation**: Every query is scoped to the server-verified `businessId` resolved from the authenticated session.

# Mizan Vision — Camera Implementation Plan

## 1. Existing Project Architecture

Mizan is an npm-workspaces monorepo (`shared`, `server`, `client`).

- **Backend:** Express + Prisma 6 + Neon PostgreSQL. Auth is JWT cookie + Bearer. Tenant is `req.tenant.businessId` from the session, never from the client body.
- **Ledger:** `createTransaction` writes `INCOME`/`EXPENSE` with Prisma.Decimal amounts. Optional `productId` + `quantity` adjust stock. CREDIT sales create a customer ledger. Collections do not book a second INCOME.
- **AI:** Gemini structured JSON, two-step confirmation (`PENDING_CONFIRMATION` → confirm + `idempotency_key`). Voice uses multer memory uploads (5MB) and Addis STT/TTS with Gemini fallback.
- **Inventory:** `Product` (name, unit, qty, threshold, selling/cost price) and `StockMovement`. Negative stock is blocked.
- **Frontend:** React 19 + Vite + Tailwind + TanStack Query. Dashboard hero has Speak / Type / Record income / Record expense. Assistant drawer is the conversational UI.

Camera capture, vision routes, barcode/brand/size, price history, and product thumbnails are implemented in this slice. Voice, text, and camera sales all call `createTransaction`.

## 2. Existing Functionalities Reused

- `createTransaction` for sale and purchase lines (stock, credit ledger, rewards).
- `createProduct` / `updateProduct` / `listProducts` for catalog matching.
- Gemini (`@google/genai`) with `responseSchema` + Zod for vision JSON.
- Multer memory storage (same pattern as `/voice/*`).
- Tenant middleware, auth, rate limit, ETB, EAT dates.
- Dashboard overlay pattern (assistant / transaction modal).

## 3. Gap Analysis

| Need | Status |
|---|---|
| Camera capture UI | Done — dashboard FAB, assistant, inventory scan |
| Vision analyze API | Done — `POST /api/v1/vision/analyze` |
| Barcode / brand / size on Product | Done |
| Price history | Done — `ProductPriceHistory` |
| Recognition hints (per-tenant learning) | Done — `ProductRecognitionHint` |
| Multi-line sale review | Done |
| Receipt scan | Best-effort Gemini extraction; confirm as purchase |
| Object storage | Not used; optional thumbnails in Postgres |

## 4. Camera Feature Architecture

```
Camera UI (getUserMedia + file fallback)
  → compress JPEG
  → POST /api/v1/vision/analyze (multipart, tenant auth)
      1. Client barcode if BarcodeDetector exists
      2. Gemini vision (catalog names/ids/barcodes only — no prices)
      3. Match to this business's products
      4. Attach selling/cost/stock from PostgreSQL
  → Review UI (qty, remove, add, price override, customer, payment)
  → POST /api/v1/vision/confirm-sale | confirm-purchase | register-product
  → existing transaction / inventory services
```

Captures used only for a sale are **not stored**. Product thumbnails are stored only if the merchant saves them on register/update.

## 5. Product Recognition Strategy

1. **Barcode** — browser `BarcodeDetector` when available; Gemini also reports visible barcodes. Exact match on `products.barcode` for this `businessId`.
2. **OCR / labels** — Gemini extracts name, brand, size, quantity guess, receipt lines.
3. **Visual type** — same Gemini call (one model, no extra paid API).
4. **Catalog match** — barcode exact, then `nameKey`, then token overlap, then confirmation hints. Scores: high ≥ 0.85, medium ≥ 0.55, else unmatched.
5. **Prices** — always from the catalog (or explicit user override). Gemini prices are discarded.

If Gemini is down: barcode-only match, otherwise empty detections and a manual catalog picker. The review UI still works.

## 6. Price Management

- Current selling/cost prices live on `Product`.
- `ProductPriceHistory` records previous + new prices, who changed them, and when.
- Historical `transactions.amount` is never rewritten when a catalog price changes.
- Sale line amount = confirmed qty × (override or catalog selling price).

## 7. Business Logic

- **Quick sale:** one `INCOME` / `SALES` row per line via `createTransaction` (`source=CAMERA`). Stock decreases. CREDIT uses existing customer ledger.
- **Unmatched line:** income without `productId` (Mode A: inventory optional).
- **Purchase:** `EXPENSE` / `INVENTORY_PURCHASE` + stock increase.
- **Register:** `createProduct` with optional thumbnail + barcode/brand/size.
- **Confirmations** are required. Analyze never writes the ledger.

## 8. Security

- Auth + `requireTenant` on all vision routes.
- Image: JPEG/PNG/WebP, max 4MB, multer memory only.
- Catalog and hints filtered by `businessId`.
- Thumbnails served only for the owning tenant (`GET /inventory/:id/image`).
- No image provider keys on the client. Gemini key stays in `server/.env`.

## 9. Implementation Roadmap

- [x] Analyze architecture
- [x] Catalog fields + price history + hints
- [x] Vision analyze / match / confirm APIs
- [x] Camera + sale review UI
- [x] Inventory register-from-camera
- [x] Purchase-from-camera
- [x] Receipt scan (best-effort in analyze; confirm as purchase or expense)
- [x] Typecheck + smoke tests

## 10. Implementation Progress

Started 21 Nov 2026. Phases 2–7 are implemented on the existing stack (Gemini vision, no new paid API). Dashboard, assistant, and inventory now open the same `VisionCapture` overlay. Confirm sale pre-validates catalog prices and aggregated stock before writing ledger lines.

Verified 21 Nov 2026:

- `npm run typecheck` passed (shared, server, client).
- `prisma db push` synced Neon (`Product` metadata, `ProductPriceHistory`, `ProductRecognitionHint`, `TransactionSource.CAMERA`).
- `POST /auth/demo` + `POST /vision/analyze` (tiny JPEG) returned structured JSON, `provider=gemini-vision`, empty items (not a product photo).
- Unmatched confirm-sale wrote `source=CAMERA`, amount 100 ETB (Mode A, no catalog).
- Catalog confirm-sale used DB price 180 × 2 = 360 ETB and reduced stock 16 → 14. Price override stored 200 ETB. AI never invented the price (`PRICE_REQUIRED` when selling price was missing).
- Confirm-purchase increased stock (14 → 16 after a 1-unit override sale and a 3-unit restock).
- Register-product created a catalog row. Unauthenticated analyze/confirm returned 401.
- `scoreProduct`: barcode exact = 1, unrelated name = 0.

## 11. Remaining Work

Completed in the follow-up slice: price history API/UI, product thumbnails, live barcode while the camera is open, receipt-total fallback, GENERAL intent routing, identify stock display, top-profit insight, landing copy for camera.

Still out of scope / later:

- Dedicated object storage / retention policy for full-resolution photos.
- Native barcode SDK when `BarcodeDetector` is missing (Gemini still reads barcodes from the photo).
- Partial payments (not in current ledger).
- Staff-role price-override policy (single OWNER today).
- Telebirr/Chapa still unused.
- Physical-phone lighting/barcode field testing.

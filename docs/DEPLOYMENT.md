# Deploying Mizan

Mizan runs as three pieces. Each has a free tier.

| Piece | Host | Configured by |
|---|---|---|
| PostgreSQL database | Neon | `DATABASE_URL` |
| API (`server/`) | Render | `render.yaml` |
| Web app (`client/`) | Vercel | `client/vercel.json` |

The browser only ever talks to the Vercel address. Vercel forwards `/api/*` to Render, so the app and the API share one origin and the login cookie works without extra setup.

Do the steps in order. Each one needs an address produced by the step before it.

## Before you start

You need accounts on [Render](https://render.com) and [Vercel](https://vercel.com), both signed in with the GitHub account that owns the repository.

Have these three values ready. They are in `server/.env` on the development machine.

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon connection string. Must end with `sslmode=require`. |
| `GEMINI_API_KEY` | Google AI Studio |
| `ADDIS_API_KEY` | Addis AI |

Do **not** copy `JWT_SECRET` from `server/.env`. Render generates a private one. The API refuses to start in production if `JWT_SECRET` is missing or is one of the example values published in this repository.

AI credits also need `PUBLIC_API_URL` (set in `render.yaml`), and, when you are ready to take payment, `CHAPA_SECRET_KEY` plus an optional `CHAPA_WEBHOOK_SECRET`. `BILLING_ADMIN_KEY` unlocks the billing admin API. Details are in `docs/MIZAN_MONETIZATION_SYSTEM.md`. Until the Chapa key is set, shops still receive the free monthly credits and no payment button is shown.

## Step 1 — Choose the database

The existing Neon database already has the current schema, so it works as is. It also holds everything created during development: the demo shop, test accounts and test transactions.

To start production with an empty database instead, create a new database (or branch) in Neon, then create the tables from the development machine:

```powershell
$env:DATABASE_URL = "postgresql://...your new Neon URL...?sslmode=require"
npm run db:push
Remove-Item Env:DATABASE_URL
```

No seed step is needed. The demo shop is created the first time someone opens it.

## Step 2 — Deploy the API on Render

1. Make sure `render.yaml` is pushed to `main` on GitHub.
2. In the Render dashboard choose **New**, then **Blueprint**, and select the Mizan repository.
3. Render reads `render.yaml` and asks for the values it does not store in Git:

   | Variable | What to enter |
   |---|---|
   | `DATABASE_URL` | The Neon connection string from step 1 |
   | `GEMINI_API_KEY` | Your Gemini key |
   | `ADDIS_API_KEY` | Your Addis AI key |
   | `CLIENT_ORIGIN` | `http://localhost:5173` for now. You replace it in step 5. |

4. Apply the Blueprint and wait for the first build to finish.
5. Copy the service address from the top of the service page. It ends in `.onrender.com`.
6. Open `https://YOUR-SERVICE.onrender.com/api/v1/health`. You should see `"db":"connected"`, `"geminiConfigured":true` and `"addisConfigured":true`. If `db` is not connected on the very first load, refresh once; the first database connection after a start can be slow.

## Step 3 — Point the web app at the API

Open `client/vercel.json` and replace `REPLACE_WITH_RENDER_BACKEND_URL` with the host you copied, without `https://` and without a trailing slash:

```json
"destination": "https://YOUR-SERVICE.onrender.com/api/:path*"
```

Use the exact address Render shows. If the name `mizan-api` was already taken, Render adds a suffix, and a guessed address could belong to someone else's service. Commit and push the change.

## Step 4 — Deploy the web app on Vercel

1. In Vercel choose **Add New**, then **Project**, and import the Mizan repository.
2. Set **Root Directory** to `client`.
3. Leave the build settings alone. `client/vercel.json` already sets the install command, build command and output folder.
4. No environment variables are needed.
5. Deploy, then copy the production address (it ends in `.vercel.app`).

## Step 5 — Tell the API where the web app lives

In Render open the `mizan-api` service, go to **Environment**, and set `CLIENT_ORIGIN` to the Vercel address, for example `https://mizan.vercel.app` with no trailing slash. Save. Render redeploys the API.

## Step 6 — Check the live site

Open the Vercel address and work through this list.

- The landing page loads and the language switch works.
- The demo shop opens and the dashboard shows numbers.
- Recording income with the form adds a row to the ledger.
- Typing to the assistant produces a draft, and confirming it records the entry.
- On a phone, **Capture photo** asks for camera permission and analyzes a product photo.
- The microphone records and a spoken reply plays back.

## Updating the live site

Pushing to `main` redeploys both the API and the web app.

Database changes are not applied automatically. After editing `server/prisma/schema.prisma`, run `npm run db:push` against the production database (as in step 1) before the new code goes live.

## Things to know

- **Render's free plan sleeps when idle.** The first request after a quiet period waits for the service to wake, and can fail. Retrying works. A paid instance stays awake.
- **Plan changes are switched off in production.** Online payment is not connected, so `ALLOW_MANUAL_BILLING` defaults to off when `NODE_ENV=production`.
- **Rate limiting may be shared between users.** The API allows 150 requests a minute per address. Because requests arrive through Vercel, Render may see Vercel's address instead of each shopkeeper's. This is fine for a pilot. Before a wider launch, check it and adjust `trust proxy` in `server/src/app.ts`.
- **Long voice and camera requests pass through Vercel.** This has not been tested on the live hosts. If short requests work but voice or camera requests fail, call the API directly: set `VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api/v1` in the Vercel project, remove the `/api/:path*` rewrite from `client/vercel.json`, and keep `CLIENT_ORIGIN` exact. The app then signs in with the token it already stores.

## If something goes wrong

| Symptom | Likely cause |
|---|---|
| Render build fails with `tsc: not found` or `prisma: not found` | The build command lost `--include=dev`. |
| Render service exits at start with a `JWT_SECRET` message | `JWT_SECRET` is unset or is an example value. Set a private one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `/api/v1/health` keeps showing the database as unreachable | `DATABASE_URL` is wrong or missing `sslmode=require`. |
| Vercel build fails with `Cannot find module '@mizan/shared'` | Root Directory is not `client`, or the build command was overridden in the dashboard. |
| The site loads but every API call fails | The placeholder in `client/vercel.json` was not replaced, or the Render address is wrong. |

## What was checked before the first deploy

Checked locally on 21 Nov 2026, on Node 24.13.0:

- `npm run build` completes for `shared`, `server` and `client`.
- `npm ci --dry-run --include=dev` reports the lockfile in sync.
- The compiled API starts with `NODE_ENV=production`, serves the demo login, inventory and summary, returns 401 without a token, sets the login cookie as `HttpOnly; Secure; SameSite=Lax`, and reports manual billing as off.
- The compiled API exits at start when `JWT_SECRET` is a published example value.

The Render and Vercel builds themselves have not been run yet.

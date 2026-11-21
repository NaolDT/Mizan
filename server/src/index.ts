import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureBillingCatalog } from "./modules/billing/catalog.js";
import { expireDueCredits } from "./modules/billing/credit.service.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[Mizan AI Server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  ensureBillingCatalog().catch((err) => {
    console.error("[Billing] catalog seed failed", err instanceof Error ? err.message : "unknown");
  });
  setInterval(() => {
    expireDueCredits().catch((err) => {
      console.error("[Billing] expiry sweep failed", err instanceof Error ? err.message : "unknown");
    });
  }, 15 * 60 * 1000).unref();
});

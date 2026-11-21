import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { businessRouter } from "./modules/business/business.routes.js";
import { rewardsRouter } from "./modules/rewards/rewards.routes.js";
import { subscriptionRouter } from "./modules/subscription/subscription.routes.js";
import { transactionRouter } from "./modules/transactions/transaction.routes.js";
import { voiceRouter } from "./modules/voice/voice.routes.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { formatEatIsoTimestamp } from "./utils/eatDate.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);

  app.get("/api/v1/health", async (_req, res) => {
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    sendSuccess(res, {
      status: "ok",
      service: "mizan-ai-server",
      timestamp: new Date().toISOString(),
      eatTime: formatEatIsoTimestamp(),
      services: {
        db: dbConnected ? "connected" : "unconfigured_or_unreachable",
        geminiConfigured: Boolean(env.GEMINI_API_KEY),
        addisConfigured: Boolean(env.ADDIS_API_KEY),
      },
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/businesses", businessRouter);
  app.use("/api/v1/transactions", transactionRouter);
  app.use("/api/v1/analytics", analyticsRouter);
  app.use("/api/v1/ai", aiRouter);
  app.use("/api/v1/voice", voiceRouter);
  app.use("/api/v1/subscription", subscriptionRouter);
  app.use("/api/v1/rewards", rewardsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

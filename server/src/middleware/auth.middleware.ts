import type { NextFunction, Request, Response } from "express";
import type { ShopRole } from "@mizan/shared";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/apiResponse.js";

export const AUTH_COOKIE_NAME = "mizan_token";

export interface JwtTokenPayload {
  sub: string; // userId
  role: "OWNER" | "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: "OWNER" | "ADMIN";
      };
      tenant?: {
        userId: string;
        businessId: string;
        shopRole: ShopRole;
      };
    }
  }
}

export function signAuthToken(payload: JwtTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function setAuthCookie(res: Response, token: string): void {
  const isProd = env.NODE_ENV === "production";
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "lax" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const bearerHeader = req.headers.authorization;
  const bearerToken =
    bearerHeader && bearerHeader.startsWith("Bearer ")
      ? bearerHeader.slice("Bearer ".length).trim()
      : null;

  const cookieToken =
    typeof req.cookies?.[AUTH_COOKIE_NAME] === "string"
      ? req.cookies[AUTH_COOKIE_NAME]
      : null;

  const token = bearerToken || cookieToken;

  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;
    if (!decoded?.sub) {
      next(new AppError(401, "INVALID_TOKEN", "Invalid authentication token"));
      return;
    }
    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch {
    next(new AppError(401, "TOKEN_EXPIRED_OR_INVALID", "Session expired. Please sign in again."));
  }
}

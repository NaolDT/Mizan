import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError, sendError } from "../utils/apiResponse.js";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid request payload", err.flatten());
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      sendError(res, 413, "IMAGE_TOO_LARGE", "Photo must be under 4MB");
      return;
    }
    sendError(res, 400, "UPLOAD_FAILED", "Could not read the photo");
    return;
  }

  // body-parser errors (malformed JSON, oversized body) are client mistakes, not server faults.
  const parserType = (err as { type?: string } | null)?.type;
  if (parserType === "entity.parse.failed") {
    sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    return;
  }
  if (parserType === "entity.too.large") {
    sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    return;
  }

  console.error("[Unhandled Server Error]:", err);
  sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected server error occurred");
}

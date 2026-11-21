import type { Product } from "@prisma/client";
import type { VisionMatchConfidence } from "@mizan/shared";
import { prisma } from "../../config/prisma.js";
import { toNameKey } from "../customers/customers.service.js";

export interface CatalogMatch {
  product: Product;
  score: number;
  confidence: VisionMatchConfidence;
  alternatives: Array<{ product: Product; score: number }>;
}

function scoreBand(score: number): VisionMatchConfidence {
  if (score >= 0.85) return "high";
  if (score >= 0.55) return "medium";
  if (score > 0) return "low";
  return "none";
}

function tokens(value: string): string[] {
  return toNameKey(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function overlapScore(a: string, b: string): number {
  const left = tokens(a);
  const right = new Set(tokens(b));
  if (left.length === 0 || right.size === 0) return 0;
  const hits = left.filter((part) => right.has(part)).length;
  return hits / Math.max(left.length, right.size);
}

export function scoreProduct(
  product: Product,
  detected: { name: string; brand?: string | null; size?: string | null; barcode?: string | null }
): number {
  const barcode = detected.barcode?.trim();
  if (barcode && product.barcode && barcode === product.barcode) return 1;

  const haystack = [product.name, product.brand, product.sizeLabel, product.aliases]
    .filter(Boolean)
    .join(" ");
  const needle = [detected.name, detected.brand, detected.size].filter(Boolean).join(" ");
  const keyA = toNameKey(product.name);
  const keyB = toNameKey(detected.name);

  if (keyA && keyB && keyA === keyB) return 0.95;
  if (keyA && keyB && (keyA.includes(keyB) || keyB.includes(keyA))) {
    return Math.max(0.8, overlapScore(haystack, needle));
  }
  const overlap = overlapScore(haystack, needle);
  if (detected.size && product.sizeLabel) {
    const sizeHit = toNameKey(product.sizeLabel) === toNameKey(detected.size);
    return Math.min(1, overlap + (sizeHit ? 0.08 : 0));
  }
  return overlap;
}

export async function matchDetectedProduct(
  businessId: string,
  detected: { name: string; brand?: string | null; size?: string | null; barcode?: string | null }
): Promise<CatalogMatch | null> {
  const barcode = detected.barcode?.trim();
  if (barcode) {
    const byCode = await prisma.product.findFirst({
      where: { businessId, barcode },
    });
    if (byCode) {
      return { product: byCode, score: 1, confidence: "high", alternatives: [] };
    }
    const hint = await prisma.productRecognitionHint.findFirst({
      where: { businessId, barcode },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    if (hint?.product) {
      return { product: hint.product, score: 0.9, confidence: "high", alternatives: [] };
    }
  }

  const products = await prisma.product.findMany({ where: { businessId } });
  if (products.length === 0) return null;

  const hintName = toNameKey(detected.name);
  if (hintName) {
    const namedHint = await prisma.productRecognitionHint.findFirst({
      where: { businessId, detectedName: { contains: hintName, mode: "insensitive" } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    if (namedHint?.product) {
      const scored = products
        .map((product) => ({ product, score: scoreProduct(product, detected) }))
        .sort((a, b) => b.score - a.score);
      return {
        product: namedHint.product,
        score: Math.max(0.85, scored[0]?.score ?? 0.85),
        confidence: "high",
        alternatives: scored
          .filter((row) => row.product.id !== namedHint.product.id && row.score >= 0.4)
          .slice(0, 3),
      };
    }
  }

  const ranked = products
    .map((product) => ({ product, score: scoreProduct(product, detected) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  const [best, ...rest] = ranked;
  return {
    product: best.product,
    score: Number(best.score.toFixed(2)),
    confidence: scoreBand(best.score),
    alternatives: rest.filter((row) => row.score >= 0.4).slice(0, 3),
  };
}

export async function rememberMatch(
  businessId: string,
  productId: string,
  detectedName: string,
  barcode?: string | null
): Promise<void> {
  const name = detectedName.trim().slice(0, 160);
  if (!name) return;
  const existing = await prisma.productRecognitionHint.findFirst({
    where: { businessId, productId, detectedName: name },
  });
  if (existing) return;
  await prisma.productRecognitionHint.create({
    data: {
      businessId,
      productId,
      detectedName: name,
      barcode: barcode?.trim().slice(0, 64) || null,
    },
  });
}

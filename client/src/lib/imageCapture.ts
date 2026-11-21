export async function compressImageFile(file: File, maxEdge = 1280, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the photo");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress the photo"))),
      "image/jpeg",
      quality
    );
  });
}

export async function detectBarcodeFromBlob(blob: Blob): Promise<string | null> {
  const Detector = (
    window as Window & {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;
  if (!Detector) return null;
  try {
    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
    });
    const bitmap = await createImageBitmap(blob);
    const codes = await detector.detect(bitmap);
    bitmap.close();
    return codes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

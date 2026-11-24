import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Plus, X } from "lucide-react";
import type {
  CustomerDto,
  PaymentMethod,
  ProductDto,
  VisionAnalyzeResponse,
  VisionConfirmResult,
  VisionDetectedItem,
  VisionWorkflow,
} from "@mizan/shared";
import { CreditGate } from "./CreditGate";
import { useLanguage } from "../context/LanguageContext";
import { WALLET_KEY } from "../hooks/useWallet";
import { VISION_TEXT } from "../i18n/visionText";
import { apiRequest, apiUpload, isInsufficientCredits } from "../lib/api";
import {
  compressImageFile,
  detectBarcodeFromBlob,
  detectBarcodeFromVideo,
} from "../lib/imageCapture";
import { formatEtb } from "../lib/format";

type ReviewLine = {
  key: string;
  detectedName: string;
  barcode: string | null;
  productId: string | null;
  productName: string | null;
  confidence: VisionDetectedItem["match"]["confidence"];
  quantity: number;
  unitPrice: number;
  unmatchedAmount: number;
  alternatives: VisionDetectedItem["match"]["alternatives"];
};

const WORKFLOWS: VisionWorkflow[] = [
  "QUICK_SALE",
  "ADD_INVENTORY",
  "SCAN_RECEIPT",
  "IDENTIFY",
  "GENERAL",
];

interface VisionCaptureProps {
  initialWorkflow?: VisionWorkflow;
  onClose: () => void;
  onOpenCredits?: () => void;
  onRecordByHand?: () => void;
}

export function VisionCapture({
  initialWorkflow = "QUICK_SALE",
  onClose,
  onOpenCredits,
  onRecordByHand,
}: VisionCaptureProps) {
  const { language, t } = useLanguage();
  const text = VISION_TEXT[language];
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [workflow, setWorkflow] = useState<VisionWorkflow>(initialWorkflow);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VisionAnalyzeResponse | null>(null);
  const [lines, setLines] = useState<ReviewLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerName, setCustomerName] = useState("");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [liveBarcode, setLiveBarcode] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest<ProductDto[]>("/inventory"),
  });
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiRequest<CustomerDto[]>("/customers"),
  });

  const products = productsQuery.data ?? [];

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setCameraError(text.cameraDenied);
      }
    }
    if (!previewUrl) void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [previewUrl, text.cameraDenied]);

  useEffect(() => {
    if (previewUrl) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      void detectBarcodeFromVideo(video).then((code) => {
        if (!cancelled && code) setLiveBarcode(code);
      });
    }, 700);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [previewUrl]);

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const raw = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => (next ? resolve(next) : reject(new Error("capture"))), "image/jpeg", 0.85);
    });
    const file = new File([raw], "capture.jpg", { type: "image/jpeg" });
    await acceptFile(file);
  };

  const acceptFile = async (file: File) => {
    const compressed = await compressImageFile(file);
    setBlob(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
    setAnalysis(null);
    setLines([]);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!blob) throw new Error(text.permissionHelp);
      const barcode = (await detectBarcodeFromBlob(blob)) || liveBarcode;
      const form = new FormData();
      form.append("image", blob, "capture.jpg");
      form.append("workflow", workflow);
      form.append("language", language);
      if (barcode) form.append("barcode", barcode);
      return apiUpload<VisionAnalyzeResponse>("/vision/analyze", form);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      const nextWorkflow =
        workflow === "GENERAL" && data.intentGuess && data.intentGuess !== "GENERAL"
          ? data.intentGuess
          : workflow;
      if (nextWorkflow !== workflow) setWorkflow(nextWorkflow);
      const purchase = nextWorkflow === "ADD_INVENTORY" || nextWorkflow === "SCAN_RECEIPT";
      setAnalysis(data);
      const mapped = data.items.map((item, index) => {
        const autoPick = item.match.confidence === "high" || item.match.confidence === "medium";
        const catalogPrice = purchase ? item.match.costPrice : item.match.sellingPrice;
        return {
          key: `${item.detectedName}-${index}`,
          detectedName: item.detectedName,
          barcode: item.barcode,
          productId: autoPick ? item.match.productId : null,
          productName: autoPick ? item.match.productName : null,
          confidence: item.match.confidence,
          quantity: item.quantityGuess || 1,
          unitPrice: autoPick ? catalogPrice ?? 0 : 0,
          unmatchedAmount: 0,
          alternatives: item.match.alternatives,
        };
      });
      if (
        mapped.length === 0 &&
        data.receipt?.total != null &&
        data.receipt.total > 0
      ) {
        mapped.push({
          key: "receipt-total",
          detectedName: data.receipt.supplier || text.addUnmatched,
          barcode: null,
          productId: null,
          productName: null,
          confidence: "none",
          quantity: 1,
          unitPrice: 0,
          unmatchedAmount: data.receipt.total,
          alternatives: [],
        });
      }
      setLines(mapped);
      if (data.receipt?.supplier) setCustomerName(data.receipt.supplier);
    },
  });

  const total = useMemo(() => {
    return lines.reduce((sum, line) => {
      if (line.productId && line.unitPrice > 0) return sum + line.unitPrice * line.quantity;
      return sum + (line.unmatchedAmount || 0);
    }, 0);
  }, [lines]);

  const invalidateShop = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["insights"] });
    queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
    queryClient.invalidateQueries({ queryKey: ["advisor"] });
  };

  const saleMutation = useMutation({
    mutationFn: () =>
      apiRequest<VisionConfirmResult>("/vision/confirm-sale", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `vision-sale-${crypto.randomUUID()}`,
          paymentMethod,
          customerName: customerName.trim() || null,
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceOverride: line.productId && line.unitPrice > 0 ? line.unitPrice : null,
            unmatchedAmount: line.productId ? null : line.unmatchedAmount || null,
            description: line.productName || line.detectedName,
            detectedName: line.detectedName,
            barcode: line.barcode,
          })),
        }),
      }),
    onSuccess: () => {
      invalidateShop();
      setDoneMessage(text.successSale);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      apiRequest<VisionConfirmResult>("/vision/confirm-purchase", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `vision-buy-${crypto.randomUUID()}`,
          paymentMethod,
          supplierName: customerName.trim() || null,
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitCost: line.productId
              ? line.unitPrice > 0
                ? line.unitPrice
                : products.find((p) => p.id === line.productId)?.costPrice || 0
              : line.unmatchedAmount || line.unitPrice,
            description: line.productName || line.detectedName,
            detectedName: line.detectedName,
          })),
        }),
      }),
    onSuccess: () => {
      invalidateShop();
      setDoneMessage(text.successPurchase);
    },
  });

  const isPurchase = workflow === "ADD_INVENTORY" || workflow === "SCAN_RECEIPT";

  const registerMutation = useMutation({
    mutationFn: async (line: ReviewLine) => {
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          name: line.detectedName,
          barcode: line.barcode,
          sellingPrice: line.unitPrice || null,
          costPrice: isPurchase ? line.unitPrice || null : null,
          quantityOnHand: line.quantity,
          detectedName: line.detectedName,
        })
      );
      if (blob) {
        const thumb = await compressImageFile(new File([blob], "thumb.jpg", { type: "image/jpeg" }), 640, 0.5);
        form.append("image", thumb, "product.jpg");
      }
      return apiUpload<ProductDto>("/vision/register-product", form);
    },
    onSuccess: (product, line) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setLines((current) =>
        current.map((row) =>
          row.key === line.key
            ? { ...row, productId: product.id, productName: product.name, unitPrice: product.sellingPrice ?? row.unitPrice }
            : row
        )
      );
      setDoneMessage(text.successProduct);
    },
  });

  const busy =
    analyzeMutation.isPending ||
    saleMutation.isPending ||
    purchaseMutation.isPending ||
    registerMutation.isPending;

  const workflowLabel: Record<VisionWorkflow, string> = {
    QUICK_SALE: text.workflowSale,
    ADD_INVENTORY: text.workflowStock,
    SCAN_RECEIPT: text.workflowReceipt,
    IDENTIFY: text.workflowIdentify,
    GENERAL: text.pickWorkflow,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{text.pickWorkflow}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WORKFLOWS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setWorkflow(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                workflow === id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {workflowLabel[id]}
            </button>
          ))}
        </div>

        {!previewUrl ? (
          <div className="mt-4 space-y-3">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full rounded-xl bg-slate-900 object-cover" />
            {cameraError && <p className="text-xs text-amber-700">{cameraError}</p>}
            {liveBarcode && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                <span>
                  {text.liveBarcode}: {liveBarcode}
                </span>
                <button type="button" onClick={() => void captureFromVideo()} className="underline">
                  {text.useBarcode}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void captureFromVideo()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
              >
                <Camera className="h-4 w-4" />
                {text.capture}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-semibold text-slate-700"
              >
                {text.choosePhoto}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void acceptFile(file);
              }}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <img src={previewUrl} alt="" className="max-h-64 w-full rounded-xl object-cover" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setBlob(null);
                  setAnalysis(null);
                  setLines([]);
                  setLiveBarcode(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold"
              >
                {text.retake}
              </button>
              <button
                type="button"
                disabled={analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {analyzeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {analyzeMutation.isPending ? text.analyzing : text.analyze}
              </button>
            </div>
            {isInsufficientCredits(analyzeMutation.error) ? (
              <CreditGate
                error={analyzeMutation.error}
                onBuyCredits={onOpenCredits}
                onRecordByHand={onRecordByHand}
              />
            ) : (
              analyzeMutation.error && (
                <p className="text-xs text-rose-600">
                  {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : "Error"}
                </p>
              )
            )}
            {analysis?.note && <p className="text-xs text-slate-500">{analysis.note}</p>}
            {analysis?.receipt && (analysis.receipt.supplier || analysis.receipt.total) && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {[analysis.receipt.supplier, analysis.receipt.date]
                  .filter(Boolean)
                  .join(" · ")}
                {analysis.receipt.total != null ? ` · ${formatEtb(analysis.receipt.total)}` : ""}
              </p>
            )}
          </div>
        )}

        {analysis && (
          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{text.reviewTitle}</h3>
            {lines.length === 0 && <p className="text-xs text-slate-500">{text.noItems}</p>}
            {lines.map((line) => (
              <div key={line.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{line.detectedName}</p>
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                  >
                    {text.removeItem}
                  </button>
                </div>
                {(line.confidence === "low" || line.confidence === "none") && (
                  <p className="text-[11px] text-amber-700">{text.lowConfidence}</p>
                )}
                {workflow === "IDENTIFY" && line.productId && (
                  <p className="text-[11px] text-slate-500">
                    {text.inStock}: {products.find((p) => p.id === line.productId)?.quantityOnHand ?? "—"}
                    {products.find((p) => p.id === line.productId)?.sellingPrice != null
                      ? ` · ${formatEtb(products.find((p) => p.id === line.productId)!.sellingPrice!)}`
                      : ""}
                  </p>
                )}
                {line.alternatives.length > 0 && !line.productId && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {line.alternatives.map((alt) => (
                      <button
                        key={alt.productId}
                        type="button"
                        onClick={() => {
                          const product = products.find((p) => p.id === alt.productId);
                          setLines((current) =>
                            current.map((row) =>
                              row.key === line.key
                                ? {
                                    ...row,
                                    productId: alt.productId,
                                    productName: alt.productName,
                                    unitPrice: isPurchase
                                      ? product?.costPrice ?? row.unitPrice
                                      : product?.sellingPrice ?? row.unitPrice,
                                    confidence: "medium",
                                  }
                                : row
                            )
                          );
                        }}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                      >
                        {alt.productName}
                      </button>
                    ))}
                  </div>
                )}
                <select
                  value={line.productId ?? ""}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    setLines((current) =>
                      current.map((row) =>
                        row.key === line.key
                          ? {
                              ...row,
                              productId: product?.id ?? null,
                              productName: product?.name ?? null,
                              unitPrice: product?.sellingPrice ?? row.unitPrice,
                              confidence: product ? "high" : "none",
                            }
                          : row
                      )
                    );
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  <option value="">{text.unmatched}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.sellingPrice != null ? ` · ${formatEtb(product.sellingPrice)}` : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-slate-500">
                    {text.qty}
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setLines((current) =>
                            current.map((row) =>
                              row.key === line.key
                                ? { ...row, quantity: Math.max(1, Number((row.quantity - 1).toFixed(2))) }
                                : row
                            )
                          )
                        }
                        className="h-8 w-8 rounded-lg border border-slate-300 text-sm font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((current) =>
                            current.map((row) =>
                              row.key === line.key ? { ...row, quantity: Number(e.target.value) || 0 } : row
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLines((current) =>
                            current.map((row) =>
                              row.key === line.key
                                ? { ...row, quantity: Number((row.quantity + 1).toFixed(2)) }
                                : row
                            )
                          )
                        }
                        className="h-8 w-8 rounded-lg border border-slate-300 text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </label>
                  <label className="text-[11px] text-slate-500">
                    {isPurchase ? text.unitCost : text.sellingPrice}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.productId ? line.unitPrice : line.unmatchedAmount}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 0;
                        setLines((current) =>
                          current.map((row) =>
                            row.key === line.key
                              ? line.productId
                                ? { ...row, unitPrice: value }
                                : { ...row, unmatchedAmount: value }
                              : row
                          )
                        );
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
                <p className="mt-2 text-right text-xs font-semibold text-slate-700">
                  {text.lineTotal}:{" "}
                  {formatEtb(
                    line.productId && line.unitPrice > 0
                      ? line.unitPrice * line.quantity
                      : line.unmatchedAmount || 0
                  )}
                </p>
                {!line.productId && (
                  <button
                    type="button"
                    onClick={() => registerMutation.mutate(line)}
                    className="mt-2 text-xs font-semibold text-emerald-700"
                  >
                    {text.registerProduct}
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    key: `manual-${Date.now()}`,
                    detectedName: text.addUnmatched,
                    barcode: null,
                    productId: null,
                    productName: null,
                    confidence: "none",
                    quantity: 1,
                    unitPrice: 0,
                    unmatchedAmount: 0,
                    alternatives: [],
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {text.useCatalog}
            </button>

            {workflow !== "IDENTIFY" && (
              <>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {(["CASH", "TELEBIRR", "BANK", "CREDIT"] as const).map((method) => (
                    <option key={method} value={method}>
                      {t.paymentMethods[method]}
                    </option>
                  ))}
                </select>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={isPurchase ? text.supplierOptional : text.customerOptional}
                  list="vision-customers"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <datalist id="vision-customers">
                  {(customersQuery.data ?? []).map((customer) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>

                <p className="text-right text-lg font-bold text-slate-900">
                  {text.total}: {formatEtb(total)}
                </p>
              </>
            )}

            {doneMessage ? (
              <div className="space-y-2">
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{doneMessage}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
                >
                  {text.done}
                </button>
              </div>
            ) : workflow !== "IDENTIFY" ? (
              <button
                type="button"
                disabled={busy || lines.length === 0}
                onClick={() => (isPurchase ? purchaseMutation.mutate() : saleMutation.mutate())}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                {isPurchase ? text.confirmPurchase : text.confirmSale}
              </button>
            ) : null}
            {(saleMutation.error || purchaseMutation.error) && (
              <p className="text-xs text-rose-600">
                {(saleMutation.error || purchaseMutation.error) instanceof Error
                  ? (saleMutation.error || purchaseMutation.error)?.message
                  : "Error"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

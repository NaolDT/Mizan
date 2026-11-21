import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillingProviderCode,
  CheckoutResponse,
  PaymentStatusDto,
  SubscriptionPlan,
  WalletDto,
} from "@mizan/shared";
import { apiRequest } from "../lib/api";

export const WALLET_KEY = ["wallet"] as const;

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: WALLET_KEY,
    queryFn: () => apiRequest<WalletDto>("/billing/wallet"),
    enabled,
    staleTime: 10_000,
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (body: {
      purpose: "SUBSCRIPTION" | "TOPUP";
      provider: BillingProviderCode;
      plan?: SubscriptionPlan;
      packageCode?: string;
    }) =>
      apiRequest<CheckoutResponse>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txRef: string) =>
      apiRequest<PaymentStatusDto>(`/billing/payments/${txRef}/verify`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
    },
  });
}

export function useSimulateDevPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { txRef: string; outcome: "success" | "failed" | "pending" | "cancelled" }) =>
      apiRequest<PaymentStatusDto>("/billing/payments/dev/simulate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
    },
  });
}

export function useCancelPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<WalletDto>("/billing/subscription/cancel", { method: "POST" }),
    onSuccess: (wallet) => {
      queryClient.setQueryData(WALLET_KEY, wallet);
    },
  });
}

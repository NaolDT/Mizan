import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillingActionResponse,
  RedeemOptionId,
  RedeemResponse,
  RewardSummaryDto,
  SubscriptionPlan,
  SubscriptionSummaryDto,
} from "@mizan/shared";
import { apiRequest } from "../lib/api";

export const SUBSCRIPTION_KEY = ["subscription"] as const;
export const REWARDS_KEY = ["rewards"] as const;

export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => apiRequest<SubscriptionSummaryDto>("/subscription"),
    enabled,
    staleTime: 15_000,
  });
}

export function useRewards(enabled = true) {
  return useQuery({
    queryKey: REWARDS_KEY,
    queryFn: () => apiRequest<RewardSummaryDto>("/rewards"),
    enabled,
    staleTime: 15_000,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: SubscriptionPlan) =>
      apiRequest<BillingActionResponse>("/subscription/plan", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(SUBSCRIPTION_KEY, res.summary);
      void queryClient.invalidateQueries({ queryKey: REWARDS_KEY });
    },
  });
}

export function useBuyVoicePack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<BillingActionResponse>("/subscription/voice-pack", { method: "POST" }),
    onSuccess: (res) => {
      queryClient.setQueryData(SUBSCRIPTION_KEY, res.summary);
    },
  });
}

export function useRedeem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (option: RedeemOptionId) =>
      apiRequest<RedeemResponse>("/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ option }),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(REWARDS_KEY, res.rewards);
      queryClient.setQueryData(SUBSCRIPTION_KEY, res.subscription);
    },
  });
}

/** Call after anything that can earn points or spend voice replies. */
export function useRefreshBilling() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    void queryClient.invalidateQueries({ queryKey: REWARDS_KEY });
  };
}

import { useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Loader2,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  RedeemOptionDto,
  ReferralDto,
  RewardSummaryDto,
  SubscriptionPlan,
  SubscriptionSummaryDto,
} from "@mizan/shared";
import { useLanguage } from "../context/LanguageContext";
import {
  useBuyVoicePack,
  useChangePlan,
  useRedeem,
  useRewards,
  useSubscription,
} from "../hooks/useBilling";
import { fill, REWARDS_TEXT, type RewardsText } from "../i18n/rewardsText";
import { formatShortDate } from "../lib/format";

function shortDate(dateKey: string): string {
  return formatShortDate(`${dateKey}T00:00:00+03:00`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="text-emerald-600">{icon}</span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function VoiceCard({ sub, text }: { sub: SubscriptionSummaryDto; text: RewardsText }) {
  const buyPack = useBuyVoicePack();
  const { quota } = sub;
  const pct = quota.monthlyAllowance
    ? Math.min(100, Math.round((quota.used / quota.monthlyAllowance) * 100))
    : 100;
  const out = quota.remaining <= 0;

  return (
    <Card title={text.voiceTitle} icon={<Mic className="h-4 w-4" />}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold text-slate-900">{quota.remaining}</p>
          <p className="text-xs text-slate-500">
            {fill(text.usedOf, { used: Math.min(quota.used, quota.monthlyAllowance), total: quota.monthlyAllowance })}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          {quota.bonusReplies > 0 && (
            <p className="font-semibold text-emerald-700">
              {fill(text.bonusReplies, { n: quota.bonusReplies })}
            </p>
          )}
          <p>{fill(text.resetsOn, { date: shortDate(quota.periodResetsOn) })}</p>
          {quota.trialEndsAt && (
            <p className="font-semibold text-amber-700">
              {fill(text.trialUntil, { date: formatShortDate(quota.trialEndsAt) })}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${out ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {out && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{text.quotaOut}</p>}

      <button
        type="button"
        disabled={buyPack.isPending || !sub.manualBillingEnabled}
        onClick={() => buyPack.mutate()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
      >
        {buyPack.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {fill(text.buyPack, { n: sub.voicePack.replies, price: sub.voicePack.priceEtb })}
      </button>
      {buyPack.error && <p className="mt-2 text-xs text-rose-600">{errorMessage(buyPack.error)}</p>}
    </Card>
  );
}

function PlansCard({ sub, text }: { sub: SubscriptionSummaryDto; text: RewardsText }) {
  const changePlan = useChangePlan();
  const [lastCharge, setLastCharge] = useState<number | null>(null);

  const choose = (plan: SubscriptionPlan) => {
    changePlan.mutate(plan, { onSuccess: (res) => setLastCharge(res.chargedEtb) });
  };

  return (
    <Card title={text.plansTitle} icon={<Sparkles className="h-4 w-4" />}>
      {sub.nextBillDiscountPct > 0 && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {fill(text.discountActive, { pct: sub.nextBillDiscountPct })}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sub.plans.map((offer) => {
          const current = offer.plan === sub.quota.plan;
          return (
            <div
              key={offer.plan}
              className={`flex flex-col rounded-xl border p-3.5 ${
                current ? "border-emerald-500 bg-emerald-50/40" : "border-slate-200"
              }`}
            >
              <p className="text-sm font-bold text-slate-900">{text.planNames[offer.plan]}</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">
                {offer.priceEtb === 0 ? text.free : fill(text.etbPerMonth, { price: offer.priceEtb })}
              </p>
              <p className="mt-1 flex-1 text-xs text-slate-500">
                {fill(text.repliesPerMonth, { n: offer.monthlyReplies })}
              </p>
              <button
                type="button"
                disabled={current || changePlan.isPending || !sub.manualBillingEnabled}
                onClick={() => choose(offer.plan)}
                className="mt-3 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
              >
                {current ? text.currentPlan : text.choose}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        {sub.manualBillingEnabled ? text.billingDemoNote : text.billingUnavailable}
      </p>
      {lastCharge !== null && lastCharge > 0 && (
        <p className="mt-1 text-xs font-semibold text-slate-700">
          {fill(text.charged, { amount: lastCharge.toFixed(2) })}
        </p>
      )}
      {changePlan.error && <p className="mt-2 text-xs text-rose-600">{errorMessage(changePlan.error)}</p>}
    </Card>
  );
}

function ReferralRow({ referral, text }: { referral: ReferralDto; text: RewardsText }) {
  const badge =
    referral.status === "QUALIFIED"
      ? "bg-emerald-100 text-emerald-800"
      : referral.status === "REJECTED"
        ? "bg-slate-200 text-slate-600"
        : "bg-amber-100 text-amber-800";

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-slate-800">{referral.referredShopName ?? "—"}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge}`}>
          {text.referralStatus[referral.status]}
        </span>
      </div>
      {referral.status === "PENDING" && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${(referral.progress.transactions / referral.progress.required) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {fill(text.progress, { done: referral.progress.transactions, total: referral.progress.required })}
          </p>
        </>
      )}
      {referral.status === "REJECTED" && referral.rejectionReason && (
        <p className="mt-1 text-[11px] text-slate-500">
          {text.rejection[referral.rejectionReason] ?? ""}
        </p>
      )}
      {referral.status === "QUALIFIED" && (
        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
          +{fill(text.pts, { n: referral.pointsEarned })}
        </p>
      )}
    </div>
  );
}

function InviteCard({ rewards, text }: { rewards: RewardSummaryDto; text: RewardsText }) {
  const [copied, setCopied] = useState(false);
  const { rules, referredBy } = rewards;

  const copyLink = async () => {
    const link = `${window.location.origin}${rewards.referralLinkPath}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt(text.copyLink, link);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card title={text.inviteTitle} icon={<Users className="h-4 w-4" />}>
      <p className="text-xs text-slate-600">
        {fill(text.inviteBody, {
          txs: rules.referralMinTransactions,
          days: rules.referralWindowDays,
          referrer: rules.referrerPoints,
          referred: rules.referredPoints,
        })}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-4 py-2.5">
          <p className="text-[11px] text-emerald-700">{text.yourCode}</p>
          <p className="font-mono text-base font-bold tracking-wide text-emerald-900">
            {rewards.referralCode}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? text.copied : text.copyLink}
        </button>
      </div>

      {referredBy && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">{text.joinedWithInvite}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {text.referralStatus[referredBy.status]}
            {referredBy.status === "PENDING" &&
              ` · ${fill(text.progress, {
                done: referredBy.progress.transactions,
                total: referredBy.progress.required,
              })}`}
          </p>
        </div>
      )}

      <h4 className="mt-5 text-xs font-bold text-slate-700">{text.invitedShops}</h4>
      {rewards.referrals.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{text.noInvites}</p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {rewards.referrals.map((referral) => (
            <ReferralRow key={referral.id} referral={referral} text={text} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RedeemRow({
  option,
  text,
  busy,
  onRedeem,
}: {
  option: RedeemOptionDto;
  text: RewardsText;
  busy: boolean;
  onRedeem: () => void;
}) {
  const copy = text.redeemOptions[option.id];
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900">{copy.name}</p>
        <p className="text-[11px] text-slate-500">{copy.description}</p>
        {option.blockedReason && (
          <p className="mt-0.5 text-[11px] font-medium text-amber-700">{text.blocked[option.blockedReason]}</p>
        )}
      </div>
      <button
        type="button"
        disabled={!option.available || busy}
        onClick={onRedeem}
        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
      >
        {fill(text.pts, { n: option.costPoints })}
      </button>
    </div>
  );
}

function PointsCard({ rewards, text }: { rewards: RewardSummaryDto; text: RewardsText }) {
  const redeem = useRedeem();
  const { rules } = rewards;

  return (
    <Card title={text.pointsTitle} icon={<Gift className="h-4 w-4" />}>
      <p className="text-3xl font-bold text-slate-900">{rewards.balance}</p>
      <p className="text-[11px] text-slate-500">{text.pointsNote}</p>

      <h4 className="mt-4 text-xs font-bold text-slate-700">{text.earnTitle}</h4>
      <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
        <li>
          {fill(text.earnFirst, { n: rules.firstTransactionsRequired, pts: rules.firstTransactionsPoints })}
        </li>
        <li>{fill(text.earnStreak, { days: rules.streakDays, pts: rules.streakPoints })}</li>
        <li>{fill(text.earnReferral, { pts: rules.referrerPoints })}</li>
      </ul>

      <h4 className="mt-5 text-xs font-bold text-slate-700">{text.redeemTitle}</h4>
      <div className="mt-2 space-y-2">
        {rewards.redeemOptions.map((option) => (
          <RedeemRow
            key={option.id}
            option={option}
            text={text}
            busy={redeem.isPending}
            onRedeem={() => redeem.mutate(option.id)}
          />
        ))}
      </div>
      {redeem.isSuccess && <p className="mt-2 text-xs font-semibold text-emerald-700">{text.redeemed}</p>}
      {redeem.error && <p className="mt-2 text-xs text-rose-600">{errorMessage(redeem.error)}</p>}

      <h4 className="mt-5 text-xs font-bold text-slate-700">{text.historyTitle}</h4>
      {rewards.ledger.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{text.noHistory}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {rewards.ledger.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate text-slate-800">{text.events[entry.type]}</p>
                <p className="text-[11px] text-slate-400">{formatShortDate(entry.createdAt)}</p>
              </div>
              <span className={`font-bold ${entry.points >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {entry.points >= 0 ? "+" : ""}
                {entry.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RewardsPanel() {
  const { language } = useLanguage();
  const text = REWARDS_TEXT[language];
  const subscription = useSubscription();
  const rewards = useRewards();

  if (subscription.isLoading || rewards.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {text.loading}
      </div>
    );
  }

  if (!subscription.data || !rewards.data) {
    return <p className="py-10 text-sm text-rose-600">{text.loadFailed}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <VoiceCard sub={subscription.data} text={text} />
        <PointsCard rewards={rewards.data} text={text} />
      </div>
      <PlansCard sub={subscription.data} text={text} />
      <InviteCard rewards={rewards.data} text={text} />
    </div>
  );
}

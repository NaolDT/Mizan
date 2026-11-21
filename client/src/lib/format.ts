export function formatEtb(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${formatted} ETB` : `${formatted} ETB`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function todayIsoDate(): string {
  const eatMs = Date.now() + 3 * 60 * 60 * 1000;
  return new Date(eatMs).toISOString().slice(0, 10);
}

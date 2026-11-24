/**
 * Deterministic East Africa Time (Africa/Addis_Ababa, UTC+3, no DST) helpers.
 * Ensures evening Ethiopian shop sales (e.g., 9:30 PM EAT) are always counted
 * under the correct Ethiopian business day regardless of cloud server timezone.
 */

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export interface DateWindow {
  startUtc: Date;
  endUtc: Date;
  previousStartUtc: Date;
  previousEndUtc: Date;
}

export function formatEatDateKey(date: Date = new Date()): string {
  const eatShifted = new Date(date.getTime() + EAT_OFFSET_MS);
  return eatShifted.toISOString().slice(0, 10);
}

export function formatEatIsoTimestamp(date: Date = new Date()): string {
  const eatShifted = new Date(date.getTime() + EAT_OFFSET_MS);
  return eatShifted.toISOString().replace("Z", "+03:00");
}

export function getEatDateWindow(
  range: "today" | "week" | "month",
  now: Date = new Date()
): DateWindow {
  const eatNow = new Date(now.getTime() + EAT_OFFSET_MS);
  const year = eatNow.getUTCFullYear();
  const month = eatNow.getUTCMonth();
  const day = eatNow.getUTCDate();

  const startOfTodayEatMs = Date.UTC(year, month, day, 0, 0, 0, 0) - EAT_OFFSET_MS;
  const endOfTodayEatMs = Date.UTC(year, month, day, 23, 59, 59, 999) - EAT_OFFSET_MS;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (range === "today") {
    return {
      startUtc: new Date(startOfTodayEatMs),
      endUtc: new Date(endOfTodayEatMs),
      previousStartUtc: new Date(startOfTodayEatMs - oneDayMs),
      previousEndUtc: new Date(endOfTodayEatMs - oneDayMs),
    };
  }

  if (range === "week") {
    const startMs = startOfTodayEatMs - 6 * oneDayMs;
    return {
      startUtc: new Date(startMs),
      endUtc: new Date(endOfTodayEatMs),
      previousStartUtc: new Date(startMs - 7 * oneDayMs),
      previousEndUtc: new Date(startMs - 1),
    };
  }

  // Month: 1st of current EAT month through end of today EAT
  const startOfMonthMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - EAT_OFFSET_MS;
  const prevMonthStartMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - EAT_OFFSET_MS;
  const prevMonthEndMs = startOfMonthMs - 1;

  return {
    startUtc: new Date(startOfMonthMs),
    endUtc: new Date(endOfTodayEatMs),
    previousStartUtc: new Date(prevMonthStartMs),
    previousEndUtc: new Date(prevMonthEndMs),
  };
}

/** Inclusive EAT calendar days in the reporting window (today=1, week=7, month=day-of-month). */
export function countEatPeriodDays(
  range: "today" | "week" | "month",
  now: Date = new Date()
): number {
  if (range === "today") return 1;
  if (range === "week") return 7;
  const eatNow = new Date(now.getTime() + EAT_OFFSET_MS);
  return eatNow.getUTCDate();
}

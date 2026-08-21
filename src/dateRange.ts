import { NavApiError, NavDateRangeError } from "./errors.js";

const MAX_DIGEST_RANGE_DAYS = 35;

const DAY_MS = 1000 * 60 * 60 * 24;

export function parseDateTimeInterval(
  interval: { dateTimeFrom: string; dateTimeTo: string },
  label: string
): { from: Date; to: Date } {
  const from = new Date(interval.dateTimeFrom);
  const to = new Date(interval.dateTimeTo);

  if (!Number.isFinite(from.getTime())) {
    throw new NavApiError(`${label}: dateTimeFrom is not a valid date: '${interval.dateTimeFrom}'`);
  }
  if (!Number.isFinite(to.getTime())) {
    throw new NavApiError(`${label}: dateTimeTo is not a valid date: '${interval.dateTimeTo}'`);
  }
  if (from.getTime() > to.getTime()) {
    throw new NavApiError(`${label}: dateTimeFrom must not be later than dateTimeTo`);
  }

  return { from, to };
}

export function assertRangeWithinLimit(from: Date, to: Date): void {
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
  if (diffDays > MAX_DIGEST_RANGE_DAYS) {
    throw new NavDateRangeError(diffDays, MAX_DIGEST_RANGE_DAYS);
  }
}

export function buildDigestChunks(from: Date, to: Date): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  let chunkStart = new Date(from);
  while (chunkStart <= to) {
    // Pure UTC millisecond arithmetic: calendar-day math (setDate) is
    // timezone-dependent and yields 35 days + 1 hour across a DST
    // fall-back boundary, which would trip assertRangeWithinLimit.
    const chunkEnd = new Date(chunkStart.getTime() + MAX_DIGEST_RANGE_DAYS * DAY_MS);
    const effectiveEnd = chunkEnd > to ? to : chunkEnd;
    chunks.push({
      from: chunkStart.toISOString(),
      to: effectiveEnd.toISOString(),
    });
    if (effectiveEnd >= to) break;
    // insDate is inclusive on both ends (>= dateTimeFrom, <= dateTimeTo),
    // so the next window must start right after the previous one to avoid
    // returning a boundary invoice twice.
    chunkStart = new Date(effectiveEnd.getTime() + 1);
  }
  return chunks;
}
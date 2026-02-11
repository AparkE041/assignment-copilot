export interface AvailabilityBlockForPlanning {
  startAt: Date;
  endAt: Date;
}

interface NormalizeOptions {
  timeZone?: string | null;
  longBlockHours?: number;
  allDayStartHour?: number;
  allDayEndHour?: number;
}

interface DefaultAvailabilityOptions {
  timeZone?: string | null;
  now?: Date;
  daysAhead?: number;
  startHour?: number;
  endHour?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat | null>();

function getFormatter(timeZone: string): Intl.DateTimeFormat | null {
  if (FORMATTER_CACHE.has(timeZone)) return FORMATTER_CACHE.get(timeZone) ?? null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    FORMATTER_CACHE.set(timeZone, formatter);
    return formatter;
  } catch {
    FORMATTER_CACHE.set(timeZone, null);
    return null;
  }
}

export function getDatePartsInTimeZone(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  const formatter = getFormatter(timeZone);
  if (!formatter) return null;

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  if ([year, month, day, hour, minute, second].some(Number.isNaN)) return null;
  return { year, month, day, hour, minute, second };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number | null {
  const parts = getDatePartsInTimeZone(date, timeZone);
  if (!parts) return null;
  const utcLike = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return utcLike - date.getTime();
}

export function zonedDateTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    if (offset === null) break;
    const nextGuess = target - offset;
    if (nextGuess === guess) break;
    guess = nextGuess;
  }
  return new Date(guess);
}

export function normalizeTimeZoneForPlanning(timeZone: string | null | undefined): string | null {
  const trimmed = timeZone?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^\/+/, "");
  if (normalized.toUpperCase() === "UTC" || normalized.toUpperCase() === "GMT") {
    return "UTC";
  }
  return normalized;
}

function expandAllDayLikeBlock(
  block: AvailabilityBlockForPlanning,
  timeZone: string,
  allDayStartHour: number,
  allDayEndHour: number,
): AvailabilityBlockForPlanning[] {
  const startParts = getDatePartsInTimeZone(block.startAt, timeZone);
  const endParts = getDatePartsInTimeZone(block.endAt, timeZone);
  if (!startParts || !endParts) return [block];

  const startDayUtc = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const endDayUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
  if (endDayUtc <= startDayUtc) return [block];

  const expanded: AvailabilityBlockForPlanning[] = [];
  for (let day = startDayUtc; day < endDayUtc; day += DAY_MS) {
    const date = new Date(day);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const dayOfMonth = date.getUTCDate();

    const dayStart = zonedDateTimeToUtcDate(
      year,
      month,
      dayOfMonth,
      allDayStartHour,
      0,
      0,
      timeZone,
    );
    const dayEnd = zonedDateTimeToUtcDate(
      year,
      month,
      dayOfMonth,
      allDayEndHour,
      0,
      0,
      timeZone,
    );
    if (dayEnd > dayStart) {
      expanded.push({ startAt: dayStart, endAt: dayEnd });
    }
  }

  return expanded.length > 0 ? expanded : [block];
}

export function buildDefaultAvailabilityForPlanning(
  options?: DefaultAvailabilityOptions,
): AvailabilityBlockForPlanning[] {
  const now = options?.now ?? new Date();
  const daysAhead = options?.daysAhead ?? 45;
  const startHour = options?.startHour ?? 9;
  const endHour = options?.endHour ?? 17;
  const timeZone = normalizeTimeZoneForPlanning(options?.timeZone ?? null);

  // Fallback for missing/invalid timezone.
  if (!timeZone || !getFormatter(timeZone)) {
    const blocks: AvailabilityBlockForPlanning[] = [];
    for (let d = 0; d < daysAhead; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const day = date.getDay();
      if (day === 0 || day === 6) continue;
      const start = new Date(date);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(date);
      end.setHours(endHour, 0, 0, 0);
      if (end > now) blocks.push({ startAt: start, endAt: end });
    }
    return blocks;
  }

  const nowParts = getDatePartsInTimeZone(now, timeZone);
  if (!nowParts) return [];

  const localStartDayUtc = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const blocks: AvailabilityBlockForPlanning[] = [];

  for (let d = 0; d < daysAhead; d++) {
    const dayUtc = new Date(localStartDayUtc + d * DAY_MS);
    const year = dayUtc.getUTCFullYear();
    const month = dayUtc.getUTCMonth() + 1;
    const day = dayUtc.getUTCDate();

    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const start = zonedDateTimeToUtcDate(year, month, day, startHour, 0, 0, timeZone);
    const end = zonedDateTimeToUtcDate(year, month, day, endHour, 0, 0, timeZone);
    if (end > now) {
      blocks.push({ startAt: start, endAt: end });
    }
  }

  return blocks;
}

export function normalizeAvailabilityBlocksForPlanning(
  blocks: AvailabilityBlockForPlanning[],
  options?: NormalizeOptions,
): AvailabilityBlockForPlanning[] {
  const longBlockHours = options?.longBlockHours ?? 20;
  const allDayStartHour = options?.allDayStartHour ?? 8;
  const allDayEndHour = options?.allDayEndHour ?? 18;
  const timeZone = normalizeTimeZoneForPlanning(options?.timeZone ?? null);

  if (!timeZone || allDayEndHour <= allDayStartHour) {
    return blocks.filter((block) => block.endAt > block.startAt);
  }

  const normalized: AvailabilityBlockForPlanning[] = [];
  for (const block of blocks) {
    if (!(block.startAt instanceof Date) || !(block.endAt instanceof Date)) continue;
    if (block.endAt <= block.startAt) continue;

    const durationHours = (block.endAt.getTime() - block.startAt.getTime()) / (60 * 60 * 1000);
    if (durationHours >= longBlockHours) {
      normalized.push(
        ...expandAllDayLikeBlock(block, timeZone, allDayStartHour, allDayEndHour),
      );
      continue;
    }

    normalized.push(block);
  }

  normalized.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return normalized;
}

/**
 * Parse ICS file content into availability blocks.
 * Supports VEVENT with DTSTART/DTEND.
 */

export interface ParsedEvent {
  start: Date;
  end: Date;
  summary?: string;
}

export interface IcsIgnoredReason {
  reason: string;
  count: number;
  examples: string[];
}

export interface IcsParseDiagnostics {
  totalEvents: number;
  parsedEvents: number;
  ignoredEvents: number;
  ignored: IcsIgnoredReason[];
}

export interface ParseIcsWithDiagnosticsResult {
  events: ParsedEvent[];
  diagnostics: IcsParseDiagnostics;
}

interface ParseIcsOptions {
  defaultTimeZone?: string | null;
}

const TIMEZONE_FORMATTERS = new Map<string, Intl.DateTimeFormat | null>();

function unfoldIcsLines(icsContent: string): string[] {
  const rawLines = icsContent.split(/\r?\n/);
  const unfolded: string[] = [];

  for (const rawLine of rawLines) {
    if (
      (rawLine.startsWith(" ") || rawLine.startsWith("\t")) &&
      unfolded.length > 0
    ) {
      unfolded[unfolded.length - 1] += rawLine.slice(1);
      continue;
    }
    unfolded.push(rawLine);
  }

  return unfolded;
}

function parsePropertyLine(line: string): {
  key: string;
  value: string;
  params: Record<string, string>;
} | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;

  const keyPart = line.slice(0, colon).trim();
  const value = line.slice(colon + 1).trim();
  if (!keyPart) return null;

  const [rawKey, ...paramParts] = keyPart.split(";");
  const key = rawKey.toUpperCase();
  const params: Record<string, string> = {};

  for (const paramPart of paramParts) {
    const [rawParamKey, ...rawParamValueParts] = paramPart.split("=");
    if (!rawParamKey || rawParamValueParts.length === 0) continue;
    const paramKey = rawParamKey.toUpperCase();
    const paramValue = rawParamValueParts.join("=").replace(/^"(.*)"$/, "$1");
    params[paramKey] = paramValue;
  }

  return { key, value, params };
}

function normalizeTimeZone(timeZone: string | null | undefined): string | null {
  const trimmed = timeZone?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^\/+/, "");
  if (normalized.toUpperCase() === "UTC" || normalized.toUpperCase() === "GMT") return "UTC";
  return normalized;
}

function getTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat | null {
  if (TIMEZONE_FORMATTERS.has(timeZone)) {
    return TIMEZONE_FORMATTERS.get(timeZone) ?? null;
  }

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
    TIMEZONE_FORMATTERS.set(timeZone, formatter);
    return formatter;
  } catch {
    TIMEZONE_FORMATTERS.set(timeZone, null);
    return null;
  }
}

function extractDateParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  const formatter = getTimeZoneFormatter(timeZone);
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
  const zoned = extractDateParts(date, timeZone);
  if (!zoned) return null;
  const utcLike = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return utcLike - date.getTime();
}

function zonedDateTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    if (offset === null) break;
    const nextGuess = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
    if (nextGuess === guess) break;
    guess = nextGuess;
  }
  return new Date(guess);
}

function parseDateValue(
  value: string,
  params: Record<string, string>,
  options?: ParseIcsOptions,
): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const valueType = params.VALUE?.toUpperCase();
  const tzid = normalizeTimeZone(params.TZID) ?? normalizeTimeZone(options?.defaultTimeZone);

  // All-day values.
  const allDayMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (valueType === "DATE" || allDayMatch) {
    if (!allDayMatch) return null;
    const [, y, m, d] = allDayMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (tzid) return zonedDateTimeToUtcDate(year, month, day, 0, 0, 0, tzid);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  // DATE-TIME values.
  const dateTimeMatch = raw.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/,
  );
  if (dateTimeMatch) {
    const [, y, m, d, hh, mm, ss, zFlag] = dateTimeMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss ?? "0");

    if (zFlag === "Z") {
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    }
    if (tzid) {
      return zonedDateTimeToUtcDate(year, month, day, hour, minute, second, tzid);
    }

    // Floating time without TZID: treat as UTC for deterministic behavior across runtimes.
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback;
}

function parseDurationToMs(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const match = raw.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const weeks = Number(match[2] ?? "0");
  const days = Number(match[3] ?? "0");
  const hours = Number(match[4] ?? "0");
  const minutes = Number(match[5] ?? "0");
  const seconds = Number(match[6] ?? "0");

  const totalSeconds =
    weeks * 7 * 24 * 60 * 60 +
    days * 24 * 60 * 60 +
    hours * 60 * 60 +
    minutes * 60 +
    seconds;
  if (totalSeconds <= 0) return null;

  return sign * totalSeconds * 1000;
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function parseIcs(icsContent: string, options?: ParseIcsOptions): ParsedEvent[] {
  return parseIcsWithDiagnostics(icsContent, options).events;
}

export function parseIcsWithDiagnostics(
  icsContent: string,
  options?: ParseIcsOptions,
): ParseIcsWithDiagnosticsResult {
  const events: ParsedEvent[] = [];
  const lines = unfoldIcsLines(icsContent);
  const profileDefaultTimeZone = normalizeTimeZone(options?.defaultTimeZone);
  let calendarDefaultTimeZone: string | null = null;
  let totalEvents = 0;
  const ignoredMap = new Map<string, { count: number; examples: Set<string> }>();
  const trackIgnored = (reason: string, summary?: string | null) => {
    const entry = ignoredMap.get(reason) ?? { count: 0, examples: new Set<string>() };
    entry.count += 1;
    if (summary && entry.examples.size < 3) {
      entry.examples.add(summary);
    }
    ignoredMap.set(reason, entry);
  };
  let current: {
    dtstart?: string;
    dtstartParams?: Record<string, string>;
    dtend?: string;
    dtendParams?: Record<string, string>;
    duration?: string;
    summary?: string;
  } = {};
  let inEvent = false;
  let inVTimezone = false;

  for (const line of lines) {
    const parsed = parsePropertyLine(line);
    if (!parsed) continue;
    const { key, value, params } = parsed;

    if (key === "BEGIN" && value === "VTIMEZONE") {
      inVTimezone = true;
      continue;
    }
    if (key === "END" && value === "VTIMEZONE") {
      inVTimezone = false;
      continue;
    }
    if (!inEvent && key === "X-WR-TIMEZONE") {
      calendarDefaultTimeZone =
        normalizeTimeZone(value) ?? calendarDefaultTimeZone;
      continue;
    }
    if (inVTimezone && key === "TZID") {
      calendarDefaultTimeZone =
        normalizeTimeZone(value) ?? calendarDefaultTimeZone;
      continue;
    }

    if (key === "BEGIN" && value === "VEVENT") {
      inEvent = true;
      totalEvents += 1;
      current = {};
    } else if (key === "END" && value === "VEVENT") {
      if (!current.dtstart) {
        trackIgnored("missing DTSTART", current.summary);
        inEvent = false;
        current = {};
        continue;
      }

      const dtstartParams = current.dtstartParams ?? {};
      const dtendParams = current.dtendParams ?? {};
      const inheritedTimeZone =
        normalizeTimeZone(dtendParams.TZID) ??
        normalizeTimeZone(dtstartParams.TZID);
      const effectiveDefaultTimeZone =
        calendarDefaultTimeZone ?? profileDefaultTimeZone ?? undefined;

      const start = parseDateValue(current.dtstart, dtstartParams, {
        defaultTimeZone: effectiveDefaultTimeZone,
      });
      if (!start) {
        trackIgnored("invalid DTSTART", current.summary);
        inEvent = false;
        current = {};
        continue;
      }

      let end: Date | null = null;
      if (current.dtend) {
        end = parseDateValue(
          current.dtend,
          {
            ...dtendParams,
            TZID: dtendParams.TZID ?? inheritedTimeZone ?? undefined,
          },
          {
            defaultTimeZone: effectiveDefaultTimeZone,
          },
        );
        if (!end) {
          trackIgnored("invalid DTEND", current.summary);
          inEvent = false;
          current = {};
          continue;
        }
      }

      if (!end && current.duration) {
        const durationMs = parseDurationToMs(current.duration);
        if (durationMs && durationMs > 0) {
          end = new Date(start.getTime() + durationMs);
        } else {
          trackIgnored("invalid DURATION", current.summary);
          inEvent = false;
          current = {};
          continue;
        }
      }

      if (!end) {
        const startIsAllDay =
          (dtstartParams.VALUE?.toUpperCase() === "DATE") ||
          /^\d{8}$/.test(current.dtstart);
        end = new Date(start.getTime() + (startIsAllDay ? 24 : 1) * 60 * 60 * 1000);
      }

      if (end <= start) {
        trackIgnored("DTEND must be after DTSTART", current.summary);
        inEvent = false;
        current = {};
        continue;
      }

      events.push({
        start,
        end,
        summary: current.summary,
      });
      inEvent = false;
      current = {};
    } else if (inEvent) {
      if (key === "DTSTART") {
        current.dtstart = value;
        current.dtstartParams = params;
      } else if (key === "DTEND") {
        current.dtend = value;
        current.dtendParams = params;
      } else if (key === "DURATION") {
        current.duration = value;
      } else if (key === "SUMMARY") {
        current.summary = unescapeIcsText(value);
      }
    }
  }

  const ignored = Array.from(ignoredMap.entries()).map(([reason, value]) => ({
    reason,
    count: value.count,
    examples: Array.from(value.examples),
  }));

  return {
    events,
    diagnostics: {
      totalEvents,
      parsedEvents: events.length,
      ignoredEvents: Math.max(totalEvents - events.length, 0),
      ignored,
    },
  };
}

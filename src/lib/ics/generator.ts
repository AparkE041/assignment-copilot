/**
 * Generate ICS feed from planned sessions.
 */

import { format } from "date-fns";

export function generateIcs(
  sessions: { id: string; title: string; startAt: Date; endAt: Date }[]
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Assignment Copilot//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const s of sessions) {
    const formatIcs = (d: Date) =>
      format(d, "yyyyMMdd") + "T" + format(d, "HHmmss");
    const start = formatIcs(s.startAt);
    const end = formatIcs(s.endAt);
    const summary = (s.title || "Session").replace(/[,;\\]/g, "\\$&");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@assignment-copilot`,
      `DTSTAMP:${formatIcs(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Parse ICS file content into availability blocks.
 * Supports VEVENT with DTSTART/DTEND.
 */

export interface ParsedEvent {
  start: Date;
  end: Date;
  summary?: string;
}

export function parseIcs(icsContent: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icsContent.split(/\r?\n/);
  let current: Partial<ParsedEvent> & { dtstart?: string; dtend?: string } = {};
  let inEvent = false;

  function parseDate(s: string): Date {
    // ICS format: DTSTART:20250115T090000 or DTSTART;TZID=America/Chicago:20250115T090000
    const match = s.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
    if (!match) return new Date(s);
    const [, y, m, d, h, min, sec] = match;
    const year = parseInt(y!, 10);
    const month = parseInt(m!, 10) - 1;
    const day = parseInt(d!, 10);
    const hour = parseInt(h ?? "0", 10);
    const minute = parseInt(min ?? "0", 10);
    const second = parseInt(sec ?? "0", 10);
    return new Date(year, month, day, hour, minute, second);
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (line.endsWith("\\") && i + 1 < lines.length) {
      line = line.slice(0, -1) + lines[++i];
    }
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const [keyPart, value] = [line.slice(0, colon), line.slice(colon + 1)];
    const key = keyPart.split(";")[0];

    if (key === "BEGIN" && value === "VEVENT") {
      inEvent = true;
      current = {};
    } else if (key === "END" && value === "VEVENT") {
      if (current.dtstart && current.dtend) {
        events.push({
          start: parseDate(current.dtstart),
          end: parseDate(current.dtend),
          summary: current.summary,
        });
      }
      inEvent = false;
      current = {};
    } else if (inEvent) {
      if (key === "DTSTART") current.dtstart = value;
      else if (key === "DTEND") current.dtend = value;
      else if (key === "SUMMARY") current.summary = value;
    }
  }

  return events;
}

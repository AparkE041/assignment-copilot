import { describe, expect, it } from "vitest";
import { parseIcs } from "@/lib/ics/parser";

describe("parseIcs", () => {
  it("parses TZID-based date-times into UTC instants", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;TZID=America/Chicago:20260212T090000",
      "DTEND;TZID=America/Chicago:20260212T110000",
      "SUMMARY:Office Hours",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T15:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-12T17:00:00.000Z");
  });

  it("parses explicit UTC date-times ending in Z", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260212T090000Z",
      "DTEND:20260212T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T09:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-12T10:00:00.000Z");
  });

  it("uses default timezone for floating date-times without TZID", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260212T090000",
      "DTEND:20260212T100000",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics, { defaultTimeZone: "America/Los_Angeles" });
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T17:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-12T18:00:00.000Z");
  });

  it("handles RFC line folding in SUMMARY", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260212T090000Z",
      "DTEND:20260212T100000Z",
      "SUMMARY:Long title",
      " continued",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe("Long titlecontinued");
  });

  it("uses DURATION when DTEND is missing", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260212T090000Z",
      "DURATION:PT90M",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T09:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-12T10:30:00.000Z");
  });

  it("defaults all-day events without DTEND to one day", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260212",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T00:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-13T00:00:00.000Z");
  });

  it("defaults timed events without DTEND to one hour", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260212T090000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.start.toISOString()).toBe("2026-02-12T09:00:00.000Z");
    expect(events[0]?.end.toISOString()).toBe("2026-02-12T10:00:00.000Z");
  });
});

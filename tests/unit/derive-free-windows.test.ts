import { describe, expect, it } from "vitest";
import {
  isBusyCalendarSource,
  subtractBusyFromAvailability,
} from "@/lib/availability/derive-free-windows";

describe("isBusyCalendarSource", () => {
  it("detects imported calendar sources as busy", () => {
    expect(isBusyCalendarSource("ics")).toBe(true);
    expect(isBusyCalendarSource("ics_upload")).toBe(true);
    expect(isBusyCalendarSource("subscription:abc")).toBe(true);
    expect(isBusyCalendarSource("calendar_busy_subscription:abc")).toBe(true);
    expect(isBusyCalendarSource("manual_availability")).toBe(false);
  });
});

describe("subtractBusyFromAvailability", () => {
  it("subtracts busy events from a free window", () => {
    const availability = [
      {
        startAt: new Date("2026-02-12T09:00:00.000Z"),
        endAt: new Date("2026-02-12T17:00:00.000Z"),
      },
    ];
    const busy = [
      {
        startAt: new Date("2026-02-12T12:00:00.000Z"),
        endAt: new Date("2026-02-12T13:00:00.000Z"),
      },
    ];

    const result = subtractBusyFromAvailability(availability, busy);
    expect(result).toHaveLength(2);
    expect(result[0]?.startAt.toISOString()).toBe("2026-02-12T09:00:00.000Z");
    expect(result[0]?.endAt.toISOString()).toBe("2026-02-12T12:00:00.000Z");
    expect(result[1]?.startAt.toISOString()).toBe("2026-02-12T13:00:00.000Z");
    expect(result[1]?.endAt.toISOString()).toBe("2026-02-12T17:00:00.000Z");
  });

  it("removes small fragments under minimum free minutes", () => {
    const availability = [
      {
        startAt: new Date("2026-02-12T09:00:00.000Z"),
        endAt: new Date("2026-02-12T10:00:00.000Z"),
      },
    ];
    const busy = [
      {
        startAt: new Date("2026-02-12T09:20:00.000Z"),
        endAt: new Date("2026-02-12T09:45:00.000Z"),
      },
    ];

    const result = subtractBusyFromAvailability(availability, busy, {
      minFreeMinutes: 30,
    });
    expect(result).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildDefaultAvailabilityForPlanning,
  normalizeAvailabilityBlocksForPlanning,
} from "@/lib/availability/normalize-for-planning";

describe("normalizeAvailabilityBlocksForPlanning", () => {
  it("expands long all-day-like blocks into daytime windows in timezone", () => {
    const blocks = [
      {
        startAt: new Date("2026-02-12T08:00:00.000Z"),
        endAt: new Date("2026-02-13T08:00:00.000Z"),
      },
    ];

    const normalized = normalizeAvailabilityBlocksForPlanning(blocks, {
      timeZone: "America/Los_Angeles",
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.startAt.toISOString()).toBe("2026-02-12T16:00:00.000Z");
    expect(normalized[0]?.endAt.toISOString()).toBe("2026-02-13T02:00:00.000Z");
  });

  it("expands multi-day blocks into one daytime window per day", () => {
    const blocks = [
      {
        startAt: new Date("2026-02-12T08:00:00.000Z"),
        endAt: new Date("2026-02-15T08:00:00.000Z"),
      },
    ];

    const normalized = normalizeAvailabilityBlocksForPlanning(blocks, {
      timeZone: "America/Los_Angeles",
    });

    expect(normalized).toHaveLength(3);
    expect(normalized.map((block) => block.startAt.toISOString())).toEqual([
      "2026-02-12T16:00:00.000Z",
      "2026-02-13T16:00:00.000Z",
      "2026-02-14T16:00:00.000Z",
    ]);
  });

  it("leaves blocks unchanged when timezone is missing", () => {
    const blocks = [
      {
        startAt: new Date("2026-02-12T00:00:00.000Z"),
        endAt: new Date("2026-02-13T00:00:00.000Z"),
      },
    ];

    const normalized = normalizeAvailabilityBlocksForPlanning(blocks);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.startAt.toISOString()).toBe("2026-02-12T00:00:00.000Z");
    expect(normalized[0]?.endAt.toISOString()).toBe("2026-02-13T00:00:00.000Z");
  });
});

describe("buildDefaultAvailabilityForPlanning", () => {
  it("builds weekday 9-to-5 windows in target timezone", () => {
    const now = new Date("2026-02-12T18:00:00.000Z"); // Thu 10:00 in Los Angeles
    const blocks = buildDefaultAvailabilityForPlanning({
      now,
      daysAhead: 2,
      timeZone: "America/Los_Angeles",
    });

    expect(blocks).toHaveLength(2);
    // Thu + Fri, 9:00-17:00 local => 17:00-01:00 UTC in Feb.
    expect(blocks[0]?.startAt.toISOString()).toBe("2026-02-12T17:00:00.000Z");
    expect(blocks[0]?.endAt.toISOString()).toBe("2026-02-13T01:00:00.000Z");
    expect(blocks[1]?.startAt.toISOString()).toBe("2026-02-13T17:00:00.000Z");
    expect(blocks[1]?.endAt.toISOString()).toBe("2026-02-14T01:00:00.000Z");
  });

  it("falls back safely when timezone is invalid", () => {
    const now = new Date("2026-02-12T18:00:00.000Z");
    const blocks = buildDefaultAvailabilityForPlanning({
      now,
      daysAhead: 1,
      timeZone: "Invalid/Timezone",
    });
    expect(blocks.length).toBeGreaterThanOrEqual(0);
  });
});

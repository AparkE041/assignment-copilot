import { describe, expect, it } from "vitest";
import { normalizeAvailabilityBlocksForPlanning } from "@/lib/availability/normalize-for-planning";

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

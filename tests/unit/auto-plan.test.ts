import { describe, it, expect } from "vitest";
import { autoPlan } from "@/lib/planning/auto-plan";

describe("autoPlan", () => {
  it("returns empty when no assignments", () => {
    const result = autoPlan([], [
      { startAt: new Date("2025-02-10T09:00"), endAt: new Date("2025-02-10T12:00") },
    ]);
    expect(result).toEqual([]);
  });

  it("returns empty when no availability", () => {
    const result = autoPlan(
      [
        {
          id: "a1",
          dueAt: new Date("2025-02-15"),
          estimatedEffortMinutes: 60,
          priority: 0,
        },
      ],
      []
    );
    expect(result).toEqual([]);
  });

  it("plans sessions within availability", () => {
    const slotStart = new Date("2026-03-10T09:00");
    const slotEnd = new Date("2026-03-10T11:00");
    const assignments = [
      {
        id: "a1",
        dueAt: new Date("2026-03-12"),
        estimatedEffortMinutes: 60,
        priority: 0,
      },
    ];
    const availability = [{ startAt: slotStart, endAt: slotEnd }];
    const result = autoPlan(assignments, availability, {
      minSessionMinutes: 30,
      maxSessionMinutes: 120,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].assignmentId).toBe("a1");
  });

  it("spreads sessions across multiple days instead of cramming one day", () => {
    // 5 assignments each needing 60 min = 300 min total
    // With maxPerDay=180 that needs at least 2 days
    const assignments = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i + 1}`,
      dueAt: new Date("2026-03-20"),
      estimatedEffortMinutes: 60,
      priority: 0,
    }));
    const availability = [
      // Day 1: 8 hours
      { startAt: new Date("2026-03-10T09:00"), endAt: new Date("2026-03-10T17:00") },
      // Day 2: 8 hours
      { startAt: new Date("2026-03-11T09:00"), endAt: new Date("2026-03-11T17:00") },
      // Day 3: 8 hours
      { startAt: new Date("2026-03-12T09:00"), endAt: new Date("2026-03-12T17:00") },
    ];
    const result = autoPlan(assignments, availability, {
      maxMinutesPerDay: 180,
    });
    expect(result.length).toBe(5);

    // Sessions should be on at least 2 different days
    const days = new Set(result.map((s) => s.startAt.toISOString().slice(0, 10)));
    expect(days.size).toBeGreaterThanOrEqual(2);
  });

  it("excludes completed assignments", () => {
    const result = autoPlan(
      [
        {
          id: "a1",
          dueAt: new Date("2026-03-12"),
          status: "done",
          estimatedEffortMinutes: 60,
          priority: 0,
        },
      ],
      [{ startAt: new Date("2026-03-10T09:00"), endAt: new Date("2026-03-10T17:00") }],
    );
    expect(result).toEqual([]);
  });
});

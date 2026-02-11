import { describe, it, expect } from "vitest";
import { autoPlan } from "@/lib/planning/auto-plan";

function dateFromNow(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("autoPlan", () => {
  it("returns empty when no assignments", () => {
    const result = autoPlan([], [
      { startAt: dateFromNow(1, 9), endAt: dateFromNow(1, 12) },
    ]);
    expect(result.sessions).toEqual([]);
  });

  it("returns empty when no availability", () => {
    const result = autoPlan(
      [
        {
          id: "a1",
          dueAt: dateFromNow(5, 23, 59),
          estimatedEffortMinutes: 60,
          priority: 0,
        },
      ],
      []
    );
    expect(result.sessions).toEqual([]);
  });

  it("plans sessions within availability", () => {
    const slotStart = dateFromNow(1, 9);
    const slotEnd = dateFromNow(1, 11);
    const assignments = [
      {
        id: "a1",
        dueAt: dateFromNow(3, 23, 0),
        estimatedEffortMinutes: 60,
        priority: 0,
      },
    ];
    const availability = [{ startAt: slotStart, endAt: slotEnd }];
    const result = autoPlan(assignments, availability, {
      minSessionMinutes: 30,
      maxSessionMinutes: 120,
    });
    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.sessions[0]?.assignmentId).toBe("a1");
  });

  it("spreads sessions across multiple days instead of cramming one day", () => {
    // 5 assignments each needing 60 min = 300 min total
    // With maxPerDay=180 that needs at least 2 days
    const assignments = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i + 1}`,
      dueAt: dateFromNow(10, 23, 59),
      estimatedEffortMinutes: 60,
      priority: 0,
    }));
    const availability = [
      // Day 1: 8 hours
      { startAt: dateFromNow(1, 9), endAt: dateFromNow(1, 17) },
      // Day 2: 8 hours
      { startAt: dateFromNow(2, 9), endAt: dateFromNow(2, 17) },
      // Day 3: 8 hours
      { startAt: dateFromNow(3, 9), endAt: dateFromNow(3, 17) },
    ];
    const result = autoPlan(assignments, availability, {
      maxMinutesPerDay: 180,
    });
    expect(result.sessions.length).toBe(5);

    // Sessions should be on at least 2 different days
    const days = new Set(result.sessions.map((s) => s.startAt.toISOString().slice(0, 10)));
    expect(days.size).toBeGreaterThanOrEqual(2);
  });

  it("excludes completed assignments", () => {
    const result = autoPlan(
      [
        {
          id: "a1",
          dueAt: dateFromNow(3, 23, 59),
          status: "done",
          estimatedEffortMinutes: 60,
          priority: 0,
        },
      ],
      [{ startAt: dateFromNow(1, 9), endAt: dateFromNow(1, 17) }],
    );
    expect(result.sessions).toEqual([]);
    expect(result.explainability.skippedAssignments[0]?.reason).toBe("already completed");
  });
});

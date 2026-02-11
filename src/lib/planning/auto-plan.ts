/**
 * Auto-plan work sessions spread across available days.
 *
 * Strategy:
 * 1. Cap work per day (default 3 hours) so sessions spread across days
 * 2. Pick assignments by soonest due date, round-robin when tied
 * 3. Completed assignments excluded, no-due-date gets synthetic +7d deadline
 */

export interface AvailabilityBlock {
  startAt: Date;
  endAt: Date;
}

export interface AssignmentForPlan {
  id: string;
  dueAt: Date | null;
  status?: string;
  estimatedEffortMinutes: number;
  priority: number;
}

export interface PlannedSession {
  assignmentId: string;
  startAt: Date;
  endAt: Date;
}

export interface PlanSkippedAssignment {
  assignmentId: string;
  dueAt: Date | null;
  estimatedEffortMinutes: number;
  priority: number;
  reason: string;
}

export interface PlanPlacementExplanation {
  assignmentId: string;
  startAt: Date;
  endAt: Date;
  dueAt: Date | null;
  priority: number;
  reason: string;
}

export interface PlanUnplannedAssignment {
  assignmentId: string;
  dueAt: Date | null;
  priority: number;
  remainingMinutes: number;
  reason: string;
}

export interface AutoPlanExplainability {
  totalAssignments: number;
  eligibleAssignments: number;
  freeWindowCount: number;
  skippedAssignments: PlanSkippedAssignment[];
  placements: PlanPlacementExplanation[];
  unplannedAssignments: PlanUnplannedAssignment[];
}

export interface AutoPlanResult {
  sessions: PlannedSession[];
  explainability: AutoPlanExplainability;
}

function describeUrgency(reference: Date, dueAt: Date): string {
  const diffMs = dueAt.getTime() - reference.getTime();
  const diffHours = diffMs / 3_600_000;
  if (diffHours <= 24) return "due within 24 hours";
  if (diffHours <= 72) return "due within 3 days";
  if (diffHours <= 24 * 7) return "due within 7 days";
  return "scheduled ahead of due date";
}

export function autoPlan(
  assignments: AssignmentForPlan[],
  availability: AvailabilityBlock[],
  options?: {
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    bufferMinutes?: number;
    maxMinutesPerDay?: number;
  },
): AutoPlanResult {
  const minSession = options?.minSessionMinutes ?? 30;
  const maxSession = options?.maxSessionMinutes ?? 60;
  const buffer = options?.bufferMinutes ?? 10;
  const maxPerDay = options?.maxMinutesPerDay ?? 180; // 3 hours max per day

  const sessions: PlannedSession[] = [];
  const placements: PlanPlacementExplanation[] = [];
  const skippedAssignments: PlanSkippedAssignment[] = [];
  const now = new Date();
  const syntheticDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Filter and sort
  const sorted = assignments
    .filter((a) => {
      if (a.status === "done") {
        skippedAssignments.push({
          assignmentId: a.id,
          dueAt: a.dueAt,
          estimatedEffortMinutes: a.estimatedEffortMinutes,
          priority: a.priority,
          reason: "already completed",
        });
        return false;
      }
      if (a.estimatedEffortMinutes <= 0) {
        skippedAssignments.push({
          assignmentId: a.id,
          dueAt: a.dueAt,
          estimatedEffortMinutes: a.estimatedEffortMinutes,
          priority: a.priority,
          reason: "estimated effort is 0 minutes",
        });
        return false;
      }
      if (a.dueAt && a.dueAt <= now) {
        skippedAssignments.push({
          assignmentId: a.id,
          dueAt: a.dueAt,
          estimatedEffortMinutes: a.estimatedEffortMinutes,
          priority: a.priority,
          reason: "due date is already in the past",
        });
        return false;
      }
      return true;
    })
    .map((a) => ({
      ...a,
      effectiveDue: a.dueAt ?? syntheticDeadline,
    }))
    .sort((a, b) => {
      const diff = a.effectiveDue.getTime() - b.effectiveDue.getTime();
      if (diff !== 0) return diff;
      return b.priority - a.priority;
    });

  if (sorted.length === 0) {
    return {
      sessions,
      explainability: {
        totalAssignments: assignments.length,
        eligibleAssignments: 0,
        freeWindowCount: 0,
        skippedAssignments,
        placements,
        unplannedAssignments: [],
      },
    };
  }

  // Build slots clamped to [now, ...)
  const slots = availability
    .filter((s) => s.endAt > now)
    .map((s) => ({
      startAt: new Date(Math.max(s.startAt.getTime(), now.getTime())),
      endAt: s.endAt,
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  if (slots.length === 0) {
    return {
      sessions,
      explainability: {
        totalAssignments: assignments.length,
        eligibleAssignments: sorted.length,
        freeWindowCount: 0,
        skippedAssignments,
        placements,
        unplannedAssignments: sorted.map((a) => ({
          assignmentId: a.id,
          dueAt: a.dueAt,
          priority: a.priority,
          remainingMinutes: a.estimatedEffortMinutes,
          reason: "no available free windows",
        })),
      },
    };
  }

  // Track remaining effort per assignment
  const remaining = new Map<string, number>();
  for (const a of sorted) {
    remaining.set(a.id, a.estimatedEffortMinutes);
  }

  // Track minutes used per calendar day (YYYY-MM-DD)
  const usedPerDay = new Map<string, number>();
  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dayUsed(d: Date): number {
    return usedPerDay.get(dayKey(d)) ?? 0;
  }
  function addDayUsed(d: Date, mins: number) {
    const k = dayKey(d);
    usedPerDay.set(k, (usedPerDay.get(k) ?? 0) + mins);
  }

  for (const slot of slots) {
    let cursor = new Date(slot.startAt);
    const slotEnd = slot.endAt;

    while (cursor.getTime() + minSession * 60_000 <= slotEnd.getTime()) {
      // Check daily cap
      const dayRemainingMins = maxPerDay - dayUsed(cursor);
      if (dayRemainingMins < minSession) {
        // Skip to start of next day's slot
        break;
      }

      // Pick best assignment that still needs work
      let best: (typeof sorted)[number] | null = null;
      for (const a of sorted) {
        const rem = remaining.get(a.id) ?? 0;
        if (rem <= 0) continue;
        if (a.effectiveDue <= cursor) continue;
        if (
          !best ||
          a.effectiveDue < best.effectiveDue ||
          (a.effectiveDue.getTime() === best.effectiveDue.getTime() &&
            a.priority > best.priority)
        ) {
          best = a;
        }
      }

      if (!best) break;

      const rem = remaining.get(best.id) ?? 0;
      const availMs = slotEnd.getTime() - cursor.getTime();

      // Determine session length, respecting all caps
      const sessionMins = Math.min(
        maxSession,
        rem,
        dayRemainingMins,
        Math.floor((availMs - buffer * 60_000) / 60_000),
      );

      if (sessionMins < minSession) break;

      const sessionEnd = new Date(cursor.getTime() + sessionMins * 60_000);
      sessions.push({
        assignmentId: best.id,
        startAt: new Date(cursor),
        endAt: sessionEnd,
      });
      placements.push({
        assignmentId: best.id,
        startAt: new Date(cursor),
        endAt: sessionEnd,
        dueAt: best.dueAt,
        priority: best.priority,
        reason: `${describeUrgency(cursor, best.effectiveDue)}; free window available; priority ${best.priority}`,
      });

      remaining.set(best.id, rem - sessionMins);
      addDayUsed(cursor, sessionMins);
      cursor = new Date(sessionEnd.getTime() + buffer * 60_000);
    }
  }

  const unplannedAssignments = sorted
    .map((a) => ({
      assignmentId: a.id,
      dueAt: a.dueAt,
      priority: a.priority,
      remainingMinutes: remaining.get(a.id) ?? 0,
    }))
    .filter((a) => a.remainingMinutes > 0)
    .map((a) => ({
      ...a,
      reason: a.dueAt
        ? "not enough free windows before due date"
        : "not enough free windows in planning horizon",
    }));

  return {
    sessions,
    explainability: {
      totalAssignments: assignments.length,
      eligibleAssignments: sorted.length,
      freeWindowCount: slots.length,
      skippedAssignments,
      placements,
      unplannedAssignments,
    },
  };
}

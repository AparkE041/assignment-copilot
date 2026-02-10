import { differenceInCalendarDays } from "date-fns";

export type AssignmentStatus = "not_started" | "in_progress" | "done" | string;

export interface UrgencyInfo {
  daysUntilDue: number;
  isUrgent: boolean;
  isOverdue: boolean;
}

/**
 * Returns urgency metadata for a due date and local status.
 * Completed assignments are never treated as urgent.
 */
export function getUrgencyInfo(
  dueAt: Date | string | null | undefined,
  status?: AssignmentStatus | null
): UrgencyInfo | null {
  if (!dueAt || status === "done") {
    return null;
  }

  const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());

  return {
    daysUntilDue,
    isUrgent: daysUntilDue <= 3,
    isOverdue: daysUntilDue < 0,
  };
}

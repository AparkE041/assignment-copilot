"use client";

import { differenceInCalendarDays, format } from "date-fns";

interface LocalDateTextProps {
  iso: string | null | undefined;
  pattern?: string;
  className?: string;
  fallback?: string;
}

interface LocalDueLabelProps {
  iso: string | null | undefined;
  className?: string;
  fallback?: string;
}

function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function LocalDateText({
  iso,
  pattern = "MMM d, yyyy",
  className,
  fallback = "",
}: LocalDateTextProps) {
  const parsed = parseLocalDate(iso);
  if (!parsed) return fallback ? <span className={className}>{fallback}</span> : null;
  return <span className={className}>{format(parsed, pattern)}</span>;
}

export function LocalDueLabel({
  iso,
  className,
  fallback = "No due date",
}: LocalDueLabelProps) {
  const dueAt = parseLocalDate(iso);
  if (!dueAt) return <span className={className}>{fallback}</span>;

  const now = new Date();
  const daysUntilDue = differenceInCalendarDays(dueAt, now);

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return (
      <span className={className}>
        {overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`}
      </span>
    );
  }

  if (daysUntilDue === 0) return <span className={className}>Due today</span>;
  if (daysUntilDue === 1) return <span className={className}>Due tomorrow</span>;
  return <span className={className}>Due in {daysUntilDue} days</span>;
}

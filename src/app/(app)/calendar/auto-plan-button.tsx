"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Sparkles, RefreshCw, Undo2 } from "lucide-react";

interface PreviewSession {
  assignmentId: string;
  startAt: string;
  endAt: string;
}

interface PlanExplainabilityItem {
  assignmentId: string;
  assignmentTitle: string;
  courseName: string | null;
  startAt?: string;
  endAt?: string;
  dueAt: string | null;
  remainingMinutes?: number;
  estimatedEffortMinutes?: number;
  priority: number;
  reason: string;
}

interface PlanPreviewPayload {
  mode: "preview";
  sessions: PreviewSession[];
  summary: {
    plannedSessions: number;
    plannedMinutes: number;
    plannedHours: number;
    assignmentsScheduled: number;
    assignmentScope: number;
  };
  explainability: {
    generatedAt: string;
    freeWindowCount: number;
    busyBlockCount: number;
    explicitAvailabilityCount: number;
    totalAssignments: number;
    eligibleAssignments: number;
    skippedAssignments: PlanExplainabilityItem[];
    placements: PlanExplainabilityItem[];
    unplannedAssignments: PlanExplainabilityItem[];
  };
}

export function AutoPlanButton() {
  const router = useRouter();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [preview, setPreview] = useState<PlanPreviewPayload | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function refreshUndoAvailability() {
    try {
      const res = await fetch("/api/plan/undo", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setCanUndo(Boolean(data.canUndo));
      setLastSnapshotAt(
        typeof data.snapshotCreatedAt === "string" ? data.snapshotCreatedAt : null,
      );
    } catch {
      // Non-blocking.
    }
  }

  useEffect(() => {
    void refreshUndoAvailability();
  }, []);

  const previewPlannedHours = useMemo(
    () => (preview ? Math.round((preview.summary.plannedMinutes / 60) * 10) / 10 : 0),
    [preview],
  );

  async function requestPreview() {
    setPreviewLoading(true);
    setMessage(null);
    try {
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          timeZone: browserTimeZone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Auto-plan failed. Please try again.",
        });
        return;
      }
      if (!data || data.mode !== "preview") {
        setMessage({ type: "error", text: "Planner preview response was invalid." });
        return;
      }
      setPreview(data as PlanPreviewPayload);
      const count = Array.isArray(data.sessions) ? data.sessions.length : 0;
      const plannedMinutes =
        typeof data.summary?.plannedMinutes === "number" ? data.summary.plannedMinutes : 0;
      const plannedHours = Math.round((plannedMinutes / 60) * 10) / 10;
      setMessage({
        type: count > 0 ? "success" : "info",
        text:
          count > 0
            ? `Draft ready: ${count} session${count === 1 ? "" : "s"} across ${plannedHours.toFixed(1)}h.`
            : "No sessions could be drafted. Review skipped/unplanned reasons below.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function applyDraft() {
    if (!preview) return;
    setApplyLoading(true);
    setMessage(null);
    try {
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          timeZone: browserTimeZone,
          draftSessions: preview.sessions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Applying draft failed. Please try again.",
        });
        return;
      }

      const applied = Array.isArray(data.sessions) ? data.sessions.length : 0;
      setPreview(null);
      setCanUndo(true);
      setLastSnapshotAt(new Date().toISOString());
      setMessage({
        type: "success",
        text: `Applied ${applied} planned session${applied === 1 ? "" : "s"}.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Applying draft failed.",
      });
    } finally {
      setApplyLoading(false);
    }
  }

  async function undoLastPlan() {
    setUndoLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plan/undo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Undo failed.",
        });
        return;
      }

      setCanUndo(false);
      setLastSnapshotAt(null);
      setPreview(null);
      setMessage({
        type: "success",
        text: `Undid last plan and restored ${data.restoredSessions ?? 0} session${data.restoredSessions === 1 ? "" : "s"}.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Undo failed.",
      });
    } finally {
      setUndoLoading(false);
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          onClick={() => void requestPreview()}
          disabled={previewLoading || applyLoading || undoLoading}
          className="rounded-xl gap-2"
        >
          {previewLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {previewLoading ? "Drafting..." : "Draft auto-plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void undoLastPlan()}
          disabled={!canUndo || previewLoading || applyLoading || undoLoading}
          className="rounded-xl gap-2"
        >
          {undoLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Undo2 className="w-4 h-4" />
          )}
          Undo last plan
        </Button>
      </div>

      {canUndo && lastSnapshotAt && (
        <p className="text-right text-xs text-muted-foreground">
          Last plan applied: {new Date(lastSnapshotAt).toLocaleString()}
        </p>
      )}

      {message && (
        <FormMessage type={message.type}>{message.text}</FormMessage>
      )}

      {preview && (
        <div className="rounded-2xl border border-border/70 bg-background/70 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Draft Plan Preview</p>
              <p className="text-xs text-muted-foreground">
                {preview.summary.plannedSessions} sessions • {previewPlannedHours.toFixed(1)}h •{" "}
                {preview.summary.assignmentsScheduled} assignments scheduled
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {preview.explainability.freeWindowCount} free windows,{" "}
              {preview.explainability.busyBlockCount} busy blocks
            </div>
          </div>

          {preview.explainability.placements.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Why sessions were placed
              </p>
              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {preview.explainability.placements.slice(0, 12).map((placement, idx) => (
                  <li
                    key={`${placement.assignmentId}-${placement.startAt}-${idx}`}
                    className="rounded-xl border border-border/60 bg-secondary/30 p-2.5"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {placement.assignmentTitle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {placement.courseName ?? "Course unknown"} •{" "}
                      {placement.startAt ? new Date(placement.startAt).toLocaleString() : ""}
                    </p>
                    <p className="mt-1 text-xs text-foreground/80">{placement.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-sm text-muted-foreground">
              No sessions could be drafted from current assignments and availability.
            </div>
          )}

          {(preview.explainability.unplannedAssignments.length > 0 ||
            preview.explainability.skippedAssignments.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {preview.explainability.unplannedAssignments.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unplanned
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {preview.explainability.unplannedAssignments.slice(0, 6).map((item) => (
                      <li key={`unplanned-${item.assignmentId}`} className="text-xs text-foreground/85">
                        {item.assignmentTitle}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.explainability.skippedAssignments.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skipped
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {preview.explainability.skippedAssignments.slice(0, 6).map((item) => (
                      <li key={`skipped-${item.assignmentId}`} className="text-xs text-foreground/85">
                        {item.assignmentTitle}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPreview(null)}
              disabled={applyLoading || previewLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => void requestPreview()}
              disabled={previewLoading || applyLoading}
            >
              {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Regenerate
            </Button>
            <Button
              type="button"
              className="rounded-xl gap-2"
              onClick={() => void applyDraft()}
              disabled={applyLoading || previewLoading}
            >
              {applyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              Apply Draft
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

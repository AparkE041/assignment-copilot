"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

const STATUSES = [
  { value: "not_started", label: "Not started", icon: Circle },
  { value: "in_progress", label: "In progress", icon: Loader2 },
  { value: "done", label: "Done", icon: CheckCircle2 },
] as const;

export function AssignmentStatusSelect({
  assignmentId,
  currentStatus,
}: {
  assignmentId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/local-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => {
        const Icon = s.icon;
        const isActive = status === s.value;
        return (
          <Button
            key={s.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="rounded-xl gap-1.5"
            disabled={loading}
            onClick={() => updateStatus(s.value)}
          >
            <Icon
              className={`w-4 h-4 ${s.value === "in_progress" && isActive ? "animate-spin" : ""}`}
            />
            {s.label}
          </Button>
        );
      })}
    </div>
  );
}

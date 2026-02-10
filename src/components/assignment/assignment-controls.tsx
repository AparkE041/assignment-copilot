"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock,
  Flag,
} from "lucide-react";

const PRIORITIES = [
  { value: 0, label: "Low", icon: ArrowDown, color: "text-muted-foreground" },
  { value: 1, label: "Medium", icon: ArrowRight, color: "text-yellow-600 dark:text-yellow-400" },
  { value: 2, label: "High", icon: ArrowUp, color: "text-red-600 dark:text-red-400" },
] as const;

interface Props {
  assignmentId: string;
  currentPriority: number;
  currentEffort: number | null;
}

export function AssignmentControls({ assignmentId, currentPriority, currentEffort }: Props) {
  const [priority, setPriority] = useState(currentPriority);
  const [effort, setEffort] = useState<string>(currentEffort?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (data: { priority?: number; estimatedEffortMinutes?: number }) => {
      setSaving(true);
      try {
        await fetch(`/api/assignments/${assignmentId}/local-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } finally {
        setSaving(false);
      }
    },
    [assignmentId],
  );

  function handlePriority(val: number) {
    setPriority(val);
    save({ priority: val });
  }

  function handleEffortBlur() {
    const num = parseInt(effort, 10);
    if (!isNaN(num) && num >= 0) {
      save({ estimatedEffortMinutes: num });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Priority selector */}
      <div className="flex items-center gap-1.5">
        <Flag className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Priority:</span>
        <div className="flex gap-1">
          {PRIORITIES.map((p) => {
            const Icon = p.icon;
            const active = priority === p.value;
            return (
              <Button
                key={p.value}
                variant={active ? "default" : "outline"}
                size="sm"
                className="rounded-lg h-7 px-2 gap-1 text-xs"
                disabled={saving}
                onClick={() => handlePriority(p.value)}
              >
                <Icon className={`w-3 h-3 ${active ? "" : p.color}`} />
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Effort input */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Effort:</span>
        <Input
          type="number"
          min={0}
          max={999}
          placeholder="min"
          value={effort}
          onChange={(e) => setEffort(e.target.value)}
          onBlur={handleEffortBlur}
          className="w-20 h-7 rounded-lg text-xs"
          disabled={saving}
        />
        <span className="text-xs text-muted-foreground">min</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncCanvasButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/canvas/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Sync failed");
        return;
      }
      setMessage(
        `Synced: ${data.coursesCreated + data.coursesUpdated} courses, ` +
          `${data.assignmentsCreated + data.assignmentsUpdated} assignments`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleSync} disabled={loading}>
        {loading ? "Syncing..." : "Sync Canvas"}
      </Button>
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

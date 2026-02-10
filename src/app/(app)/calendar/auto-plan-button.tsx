"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Sparkles, RefreshCw } from "lucide-react";

export function AutoPlanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Auto-plan failed. Please try again.",
        });
        return;
      }
      const count = Array.isArray(data.sessions) ? data.sessions.length : 0;
      if (count > 0) {
        setMessage({
          type: "success",
          text: `Created ${count} session${count === 1 ? "" : "s"}. Refreshing...`,
        });
        // Use router.refresh() for a smooth transition instead of full reload
        router.refresh();
      } else {
        setMessage({
          type: "info",
          text: "No sessions created. Make sure you have assignments with future due dates (sync Canvas on the Dashboard).",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl gap-2"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading ? "Planning..." : "Auto-plan sessions"}
      </Button>
      {message && (
        <FormMessage type={message.type}>{message.text}</FormMessage>
      )}
    </div>
  );
}

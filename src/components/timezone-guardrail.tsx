"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export function TimezoneGuardrail({ storedTimezone }: { storedTimezone: string | null }) {
  const [browserTimezone, setBrowserTimezone] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setBrowserTimezone(tz || null);
  }, []);

  const shouldShow =
    !!browserTimezone &&
    !!storedTimezone &&
    browserTimezone !== storedTimezone &&
    !dismissed;

  async function applyBrowserTimezone() {
    if (!browserTimezone) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: browserTimezone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Could not update timezone.",
        });
        return;
      }
      setMessage({
        type: "success",
        text: `Timezone updated to ${browserTimezone}.`,
      });
      setDismissed(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not update timezone.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!shouldShow && !message) return null;

  return (
    <div className="space-y-2">
      {shouldShow && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-foreground">
            Your saved timezone is <strong>{storedTimezone}</strong>, but this browser is{" "}
            <strong>{browserTimezone}</strong>. This can shift due dates and plan times.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void applyBrowserTimezone()}
              disabled={saving}
              className="rounded-lg"
            >
              {saving ? "Updating..." : "Use Browser Timezone"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDismissed(true)}
              disabled={saving}
              className="rounded-lg"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
    </div>
  );
}

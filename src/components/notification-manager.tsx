"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInHours, format } from "date-fns";

/**
 * Checks for upcoming assignments and shows browser notifications.
 * Also renders a small banner if permission hasn't been granted.
 */
export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [dismissed, setDismissed] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);

    // Check if user previously dismissed the banner
    if (localStorage.getItem("notif-dismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  // Schedule check when permission is granted
  useEffect(() => {
    if (permission !== "granted" || checkedRef.current) return;
    checkedRef.current = true;

    checkAndNotify();
    // Re-check every 30 minutes
    const interval = setInterval(checkAndNotify, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [permission]);

  async function checkAndNotify() {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const data = await res.json();

      const now = new Date();
      const notifiedKey = `notified-${now.toISOString().slice(0, 10)}`;
      const alreadyNotified = new Set(
        JSON.parse(localStorage.getItem(notifiedKey) ?? "[]") as string[],
      );

      for (const assignment of data.assignments ?? []) {
        if (!assignment.dueAt || alreadyNotified.has(assignment.id)) continue;
        const dueDate = new Date(assignment.dueAt);
        const hoursLeft = differenceInHours(dueDate, now);

        if (hoursLeft > 0 && hoursLeft <= 24) {
          const status = assignment.localState?.status;
          if (status === "done") continue;

          new Notification("Assignment Due Soon", {
            body: `${assignment.title} is due ${hoursLeft <= 2 ? "in " + hoursLeft + " hours" : "tomorrow at " + format(dueDate, "h:mm a")}`,
            icon: "/favicon.ico",
            tag: assignment.id,
          });

          alreadyNotified.add(assignment.id);
        }
      }

      localStorage.setItem(notifiedKey, JSON.stringify([...alreadyNotified]));
    } catch {
      // Silently fail
    }
  }

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("notif-dismissed", "true");
  }

  // Don't show anything if already granted, denied, or dismissed
  if (
    permission === "granted" ||
    permission === "denied" ||
    permission === "unsupported" ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Enable notifications?</p>
        <p className="text-xs text-muted-foreground">
          Get reminded when assignments are due within 24 hours.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" className="rounded-xl gap-1.5" onClick={requestPermission}>
          <Bell className="w-3.5 h-3.5" />
          Enable
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";

interface SyncHealthResponse {
  checkedAt: string;
  canvas: {
    connected: boolean;
    lastStatus: string;
    lastMessage: string | null;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
  };
  icsUpload: {
    importedBlocks: number;
    latestImportedAt: string | null;
    lastStatus: string;
    lastAttemptAt: string | null;
    lastMessage: string | null;
    parsedEvents: number | null;
    ignoredEvents: number | null;
  };
  subscriptions: {
    total: number;
    success: number;
    failed: number;
    neverSynced: number;
    items: Array<{
      id: string;
      name: string | null;
      lastStatus: string;
      lastSyncedAt: string | null;
      lastMessage: string | null;
    }>;
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "success") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

export function SyncHealthCenter() {
  const [data, setData] = useState<SyncHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCanvasLoading, setRetryCanvasLoading] = useState(false);
  const [retrySubscriptionsLoading, setRetrySubscriptionsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync/health", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as SyncHealthResponse & {
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: "error",
          text: json.error ?? "Failed to load sync health.",
        });
        return;
      }
      setData(json);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load sync health.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function retryCanvas() {
    setRetryCanvasLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "canvas" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: json.error ?? "Canvas retry failed." });
        return;
      }
      setMessage({ type: "success", text: "Canvas sync retried successfully." });
      await load();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Canvas retry failed.",
      });
    } finally {
      setRetryCanvasLoading(false);
    }
  }

  async function retrySubscriptions() {
    setRetrySubscriptionsLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "subscriptions" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: json.error ?? "Calendar retry failed." });
        return;
      }
      const failed = typeof json.failed === "number" ? json.failed : 0;
      setMessage({
        type: failed > 0 ? "info" : "success",
        text:
          failed > 0
            ? `Retried feeds with ${failed} failure${failed === 1 ? "" : "s"}.`
            : "Retried feeds successfully.",
      });
      await load();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Calendar retry failed.",
      });
    } finally {
      setRetrySubscriptionsLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-sm text-muted-foreground">
        Loading sync health...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Unified health for Canvas, ICS upload, and subscribed calendars.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl gap-2"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {data?.checkedAt && (
        <p className="text-xs text-muted-foreground">
          Last checked: {formatDateTime(data.checkedAt)}
        </p>
      )}
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {data && (
        <div className="grid gap-3">
          <section className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Canvas Sync</p>
                <p className="text-xs text-muted-foreground">
                  Last success: {formatDateTime(data.canvas.lastSuccessAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last failure: {formatDateTime(data.canvas.lastFailureAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(data.canvas.lastStatus)}>
                  {data.canvas.lastStatus}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => void retryCanvas()}
                  disabled={!data.canvas.connected || retryCanvasLoading}
                >
                  {retryCanvasLoading ? "Retrying..." : "Retry now"}
                </Button>
              </div>
            </div>
            {data.canvas.lastMessage && (
              <p className="mt-2 text-xs text-muted-foreground">{data.canvas.lastMessage}</p>
            )}
          </section>

          <section className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">ICS Upload</p>
                <p className="text-xs text-muted-foreground">
                  Imported blocks: {data.icsUpload.importedBlocks}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last import: {formatDateTime(data.icsUpload.latestImportedAt)}
                </p>
              </div>
              <Badge variant={statusVariant(data.icsUpload.lastStatus)}>
                {data.icsUpload.lastStatus}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Parsed: {data.icsUpload.parsedEvents ?? 0} • Ignored:{" "}
              {data.icsUpload.ignoredEvents ?? 0}
            </p>
          </section>

          <section className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Subscribed Calendars</p>
                <p className="text-xs text-muted-foreground">
                  {data.subscriptions.total} connected • {data.subscriptions.success} healthy •{" "}
                  {data.subscriptions.failed} failed
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void retrySubscriptions()}
                disabled={data.subscriptions.total === 0 || retrySubscriptionsLoading}
              >
                {retrySubscriptionsLoading ? "Retrying..." : "Retry now"}
              </Button>
            </div>
            {data.subscriptions.items.length > 0 && (
              <ul className="mt-3 space-y-2">
                {data.subscriptions.items.slice(0, 4).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/60 bg-background/50 px-2.5 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        {item.name || "Subscribed calendar"}
                      </p>
                      <Badge variant={statusVariant(item.lastStatus)}>{item.lastStatus}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last sync: {formatDateTime(item.lastSyncedAt)}
                    </p>
                    {item.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1">{item.lastMessage}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

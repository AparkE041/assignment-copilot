"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { safeJson } from "@/lib/safe-json";

interface AvailabilitySubscription {
  id: string;
  name: string | null;
  feedUrlMasked: string;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
}

interface IcsUploadStatus {
  importedBlocks: number;
  latestImportedAt: string | null;
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

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" {
  if (status === "success") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function getStatusLabel(status: string | null): string {
  if (status === "success") return "Synced";
  if (status === "failed") return "Failed";
  return "Not synced";
}

export function AvailabilityImport() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscriptionActionId, setSubscriptionActionId] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [subscriptions, setSubscriptions] = useState<AvailabilitySubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [icsStatus, setIcsStatus] = useState<IcsUploadStatus>({
    importedBlocks: 0,
    latestImportedAt: null,
  });
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const hasUploadedIcs = icsStatus.importedBlocks > 0 || !!icsStatus.latestImportedAt;

  useEffect(() => {
    void Promise.all([loadSubscriptions(), loadIcsStatus()]);
  }, []);

  async function loadIcsStatus() {
    try {
      const res = await fetch("/api/availability/import", {
        cache: "no-store",
      });
      const data = await safeJson<IcsUploadStatus & { error?: string }>(res);
      if (!res.ok) return;
      setIcsStatus({
        importedBlocks: data.importedBlocks ?? 0,
        latestImportedAt: data.latestImportedAt ?? null,
      });
    } catch {
      // Non-blocking.
    }
  }

  async function loadSubscriptions() {
    setSubscriptionsLoading(true);
    try {
      const res = await fetch("/api/availability/subscriptions", {
        cache: "no-store",
      });
      const data = await safeJson<{
        subscriptions?: AvailabilitySubscription[];
        error?: string;
      }>(res);
      if (!res.ok) {
        setSubscriptionMessage({
          type: "error",
          text: data.error ?? "Failed to load subscriptions.",
        });
        return;
      }
      setSubscriptions(data.subscriptions ?? []);
    } catch (err) {
      setSubscriptionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load subscriptions.",
      });
    } finally {
      setSubscriptionsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadMessage({ type: "error", text: "Please select an .ics file." });
      return;
    }

    setUploadLoading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/availability/import", {
        method: "POST",
        body: formData,
      });
      const data = await safeJson<{
        imported?: number;
        error?: string;
      }>(res);
      if (!res.ok) {
        setUploadMessage({ type: "error", text: data.error ?? "Import failed." });
        return;
      }
      const imported = data.imported ?? 0;
      setUploadMessage({
        type: "success",
        text: `Imported ${imported} busy block${imported === 1 ? "" : "s"} from file.`,
      });
      await loadIcsStatus();
      fileInput.value = "";
    } catch (err) {
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Import failed.",
      });
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!feedUrl.trim()) {
      setSubscriptionMessage({ type: "error", text: "Calendar feed URL is required." });
      return;
    }

    setSubscribeLoading(true);
    setSubscriptionMessage(null);
    try {
      const res = await fetch("/api/availability/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl: feedUrl.trim(),
          name: feedName.trim() || undefined,
        }),
      });
      const data = await safeJson<{
        imported?: number;
        warning?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        setSubscriptionMessage({
          type: "error",
          text: data.error ?? "Failed to subscribe to calendar feed.",
        });
        return;
      }

      await loadSubscriptions();
      setFeedUrl("");
      setFeedName("");
      if (data.warning) {
        setSubscriptionMessage({
          type: "error",
          text: `Feed saved, but initial sync failed: ${data.warning}`,
        });
      } else {
        const imported = data.imported ?? 0;
        setSubscriptionMessage({
          type: "success",
          text: `Feed connected and imported ${imported} busy block${imported === 1 ? "" : "s"}.`,
        });
      }
    } catch (err) {
      setSubscriptionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to subscribe to calendar feed.",
      });
    } finally {
      setSubscribeLoading(false);
    }
  }

  async function handleSync(id: string) {
    setSubscriptionActionId(id);
    setSubscriptionMessage(null);
    try {
      const res = await fetch(`/api/availability/subscriptions/${id}/sync`, {
        method: "POST",
      });
      const data = await safeJson<{
        imported?: number;
        error?: string;
      }>(res);
      if (!res.ok) {
        setSubscriptionMessage({
          type: "error",
          text: data.error ?? "Failed to sync calendar feed.",
        });
        return;
      }

      await loadSubscriptions();
      const imported = data.imported ?? 0;
      setSubscriptionMessage({
        type: "success",
        text: `Synced calendar feed and imported ${imported} busy block${imported === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      setSubscriptionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to sync calendar feed.",
      });
    } finally {
      setSubscriptionActionId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Remove this calendar subscription?");
    if (!confirmed) return;

    setSubscriptionActionId(id);
    setSubscriptionMessage(null);
    try {
      const res = await fetch(`/api/availability/subscriptions/${id}`, {
        method: "DELETE",
      });
      const data = await safeJson<{ error?: string }>(res);
      if (!res.ok) {
        setSubscriptionMessage({
          type: "error",
          text: data.error ?? "Failed to remove subscription.",
        });
        return;
      }

      setSubscriptions((current) => current.filter((subscription) => subscription.id !== id));
      setSubscriptionMessage({
        type: "success",
        text: "Calendar subscription removed.",
      });
    } catch (err) {
      setSubscriptionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove subscription.",
      });
    } finally {
      setSubscriptionActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Upload an ICS file</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Best for one-time imports from downloaded calendar files.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ics-file">ICS file</Label>
            <Input
              id="ics-file"
              type="file"
              accept=".ics"
              disabled={uploadLoading}
              className="mt-2 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={uploadLoading} className="rounded-xl">
            {uploadLoading ? "Importing..." : "Import ICS File"}
          </Button>
          {uploadMessage && (
            <FormMessage type={uploadMessage.type}>
              {uploadMessage.text}
            </FormMessage>
          )}
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Uploaded ICS Status
            </p>
            <p className="mt-1 text-sm text-foreground">
              {icsStatus.importedBlocks} busy block{icsStatus.importedBlocks === 1 ? "" : "s"} imported
            </p>
            <p className="text-xs text-muted-foreground">
              Last import: {formatDateTime(icsStatus.latestImportedAt)}
            </p>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Subscribe to a calendar feed</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Use this for calendars that provide a URL (`webcal://` or `https://`) but no downloadable ICS file.
          </p>
        </div>

        <form onSubmit={handleSubscribe} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feed-url">Calendar feed URL</Label>
            <Input
              id="feed-url"
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="webcal://example.com/calendar.ics"
              disabled={subscribeLoading}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feed-name">Calendar name (optional)</Label>
            <Input
              id="feed-name"
              type="text"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              placeholder="Work schedule"
              maxLength={80}
              disabled={subscribeLoading}
              className="rounded-xl"
            />
          </div>
          <Button type="submit" disabled={subscribeLoading} className="rounded-xl">
            {subscribeLoading ? "Connecting..." : "Subscribe Calendar"}
          </Button>
        </form>

        {subscriptionMessage && (
          <FormMessage type={subscriptionMessage.type}>
            {subscriptionMessage.text}
          </FormMessage>
        )}

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connected Feeds
          </h4>

          {subscriptionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading subscriptions...</p>
          ) : !hasUploadedIcs && subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connected calendar sources yet.
            </p>
          ) : (
            <div className="space-y-3">
              {hasUploadedIcs && (
                <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Uploaded ICS file
                      </p>
                      <p className="text-xs text-muted-foreground break-all">
                        Local file upload
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={icsStatus.importedBlocks > 0 ? "default" : "secondary"}>
                          {icsStatus.importedBlocks > 0 ? "Imported" : "No blocks"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Last import: {formatDateTime(icsStatus.latestImportedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {icsStatus.importedBlocks} busy block
                        {icsStatus.importedBlocks === 1 ? "" : "s"} stored
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Upload a new ICS file to refresh
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {subscriptions.map((subscription) => {
                const busy = subscriptionActionId === subscription.id;
                return (
                  <div
                    key={subscription.id}
                    className="rounded-xl border border-border/70 bg-background/70 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {subscription.name || "Subscribed calendar"}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">
                          {subscription.feedUrlMasked}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={getStatusVariant(subscription.lastSyncStatus)}>
                            {getStatusLabel(subscription.lastSyncStatus)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last sync: {formatDateTime(subscription.lastSyncedAt)}
                          </span>
                        </div>
                        {subscription.lastSyncMessage && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {subscription.lastSyncMessage}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleSync(subscription.id)}
                          className="rounded-lg"
                        >
                          {busy ? "Working..." : "Sync now"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleDelete(subscription.id)}
                          className="rounded-lg text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

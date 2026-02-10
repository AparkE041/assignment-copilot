"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";

export function CalendarExport() {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/calendar/feed")
      .then((r) => r.json())
      .then((data) => setFeedUrl(data.feedUrl ?? null))
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.feedUrl) {
        setFeedUrl(data.feedUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = feedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {feedUrl ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subscription URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={feedUrl}
                className="font-mono text-sm rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="rounded-xl shrink-0"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            In Apple Calendar: File → New Calendar Subscription → paste this URL.
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Regenerating..." : "Regenerate URL"}
          </Button>
        </div>
      ) : (
        <Button onClick={handleGenerate} disabled={loading} className="rounded-xl">
          {loading ? "Generating..." : "Generate feed URL"}
        </Button>
      )}
    </div>
  );
}

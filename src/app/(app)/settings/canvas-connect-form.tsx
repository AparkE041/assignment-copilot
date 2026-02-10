"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

export function CanvasConnectForm({
  isConnected,
  hasEnvPat,
}: {
  isConnected: boolean;
  hasEnvPat: boolean;
}) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/canvas/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save token" });
        return;
      }
      setMessage({ type: "success", text: "Token saved. Use Sync Canvas on the dashboard to fetch assignments." });
      setToken("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save token" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="token">Personal Access Token</Label>
        <Input
          id="token"
          type="password"
          placeholder={isConnected || hasEnvPat ? "••••••••" : "Paste your token"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={loading}
          className="rounded-xl"
        />
      </div>
      <Button type="submit" disabled={loading || !token.trim()} className="rounded-xl">
        {loading ? "Saving..." : "Save token"}
      </Button>
      {isConnected && !token && (
        <FormMessage type="info">
          Canvas is connected. Enter a new token to update.
        </FormMessage>
      )}
      {hasEnvPat && (
        <FormMessage type="info">
          CANVAS_PAT is set in env. You can sync without saving a token.
        </FormMessage>
      )}
      {message && (
        <FormMessage type={message.type}>
          {message.text}
        </FormMessage>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

export function AvailabilityImport() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setMessage({ type: "error", text: "Please select an .ics file" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/availability/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Import failed" });
        return;
      }
      setMessage({ type: "success", text: `Successfully imported ${data.imported ?? 0} availability block${data.imported === 1 ? "" : "s"}.` });
      fileInput.value = "";
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="ics-file">ICS file</Label>
        <Input
          id="ics-file"
          type="file"
          accept=".ics"
          disabled={loading}
          className="mt-2 rounded-xl"
        />
      </div>
      <Button type="submit" disabled={loading} className="rounded-xl">
        {loading ? "Importing..." : "Import ICS"}
      </Button>
      {message && (
        <FormMessage type={message.type}>
          {message.text}
        </FormMessage>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";
import { Sparkles, RefreshCw } from "lucide-react";
import type { ChecklistItem } from "@prisma/client";

export function ChecklistSection({
  assignmentId,
  items: initialItems,
}: {
  assignmentId: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function toggleItem(itemId: string, checked: boolean) {
    setLoading(itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked } : i)),
    );
    try {
      const res = await fetch(`/api/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      if (!res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, checked: !checked } : i,
          ),
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading("add");
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          title: newTitle.trim(),
          order: items.length,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setNewTitle("");
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleAiGenerate() {
    setAiLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/ai-summary`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "AI generation failed",
        });
        return;
      }
      if (data.checklistCount > 0) {
        setMessage({
          type: "success",
          text: `Generated ${data.checklistCount} checklist items.`,
        });
        // Refresh to load new items from DB
        router.refresh();
        // Also refetch from server since router.refresh might take a moment
        setTimeout(() => window.location.reload(), 500);
      } else {
        setMessage({
          type: "info",
          text: "Checklist items already exist or AI returned none. Clear existing items first to regenerate.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setAiLoading(false);
    }
  }

  const completedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <Card className="glass border-0 rounded-2xl shadow-apple">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Checklist</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Break the assignment into steps and track progress
            </p>
          </div>
          {items.length === 0 && (
            <Button
              onClick={handleAiGenerate}
              disabled={aiLoading}
              size="sm"
              className="rounded-xl gap-2"
            >
              {aiLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {aiLoading ? "Generating..." : "Generate with AI"}
            </Button>
          )}
        </div>
        {message && (
          <div className="mt-2">
            <FormMessage type={message.type}>{message.text}</FormMessage>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount} of {items.length} completed
              </span>
              <span className="font-medium text-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No checklist items yet. Generate them with AI or add manually
              below.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <Checkbox
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={(checked) =>
                    toggleItem(item.id, checked === true)
                  }
                  disabled={loading === item.id}
                />
                <label
                  htmlFor={item.id}
                  className={`flex-1 cursor-pointer transition-all text-sm ${
                    item.checked
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {item.title}
                </label>
              </li>
            ))}
          </ul>
        )}

        {/* Add manually */}
        <form onSubmit={addItem} className="flex gap-2">
          <Input
            placeholder="Add item..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={loading === "add"}
            className="rounded-xl"
          />
          <Button
            type="submit"
            disabled={loading === "add" || !newTitle.trim()}
            variant="outline"
            className="rounded-xl"
          >
            {loading === "add" ? "Adding..." : "Add"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { safeJson } from "@/lib/safe-json";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({
  assignmentId,
  threadId: initialThreadId,
  messages: initialMessages,
  integrityDefaults = {
    mode: "help_me_learn",
    neverWriteFinalAnswers: true,
  },
}: {
  assignmentId: string;
  threadId?: string | null;
  messages: ChatMessage[];
  integrityDefaults?: { mode: string; neverWriteFinalAnswers: boolean };
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(initialThreadId ?? null);
  const [integrity, setIntegrity] = useState(integrityDefaults);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          threadId,
          message: userMessage,
          integrity: {
            mode: integrity.mode,
            neverWriteFinalAnswers: integrity.neverWriteFinalAnswers,
          },
        }),
      });

      if (!res.ok) {
        const data = await safeJson<{ error?: string }>(res);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: `Error: ${data.error ?? res.statusText}`,
          },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.threadId && !threadId) setThreadId(parsed.threadId);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: assistantContent };
                  }
                  return next;
                });
              }
              if (parsed.error) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant" && !last.content) {
                    next[next.length - 1] = { ...last, content: parsed.error };
                  }
                  return next;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      // threadId is sent in first SSE event
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <Label>Mode:</Label>
            <select
              value={integrity.mode}
              onChange={(e) =>
                setIntegrity((prev) => ({ ...prev, mode: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="help_me_learn">Help me learn</option>
              <option value="drafting_help">Drafting help</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="never-final"
              checked={integrity.neverWriteFinalAnswers}
              onCheckedChange={(checked) =>
                setIntegrity((prev) => ({
                  ...prev,
                  neverWriteFinalAnswers: checked === true,
                }))
              }
            />
            <Label htmlFor="never-final">Never write final answers</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ask about this assignment. The AI has access to the description and
              attachments.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "text-right"
                    : "text-left bg-muted/50 rounded p-2"
                }
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            rows={2}
            className="resize-none"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? "..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

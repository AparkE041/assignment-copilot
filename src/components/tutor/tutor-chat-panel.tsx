"use client";

import { useState, useRef, useEffect } from "react";
import { safeJson } from "@/lib/safe-json";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function TutorChatPanel({
  initialMessages,
}: {
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-16);

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ask about your assignments, due dates, or concepts. I can help you
            understand requirements, plan your work, and study more effectively.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "text-right ml-8"
                  : "text-left mr-8 bg-secondary/50 rounded-xl p-3"
              }
            >
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-t border-border"
      >
        <Textarea
          placeholder="Ask about assignments or concepts..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          rows={2}
          className="resize-none rounded-xl"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl shrink-0"
        >
          {loading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  );
}

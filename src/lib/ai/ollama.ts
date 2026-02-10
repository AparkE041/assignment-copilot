import type { ChatMessage, AIProvider } from "./provider";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const ollamaProvider: AIProvider = {
  async *streamChat(
    messages: ChatMessage[],
    options?: { model?: string }
  ) {
    const model = options?.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) {
          try {
            const obj = JSON.parse(line);
            const content = obj.message?.content;
            if (content) yield content;
          } catch {
            // skip invalid JSON
          }
        }
      }
    }
  },
};

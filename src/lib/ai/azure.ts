import { AzureOpenAI } from "openai";
import type { ChatMessage, AIProvider } from "./provider";

export function createAzureProvider(
  apiKey: string,
  endpoint: string,
  deployment?: string,
): AIProvider {
  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  });

  return {
    async *streamChat(messages: ChatMessage[], options?: { model?: string }) {
      const deploymentName =
        options?.model ??
        deployment ??
        process.env.AZURE_OPENAI_DEPLOYMENT ??
        "gpt-41";
      const stream = await client.chat.completions.create({
        model: deploymentName,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
  };
}

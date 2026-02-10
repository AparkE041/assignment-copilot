/**
 * AI provider: Azure OpenAI / AI Foundry (chat, tutor, syllabus categorization).
 */

import { prisma } from "@/lib/prisma";
import { createAzureProvider } from "./azure";

export type IntegrityMode = "help_me_learn" | "drafting_help";
export interface IntegritySettings {
  mode: IntegrityMode;
  neverWriteFinalAnswers: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderOptions {
  model?: string;
  maxTokens?: number;
}

export interface AIProvider {
  streamChat(
    messages: ChatMessage[],
    options?: ProviderOptions
  ): AsyncIterable<string>;
}

/**
 * Returns Azure OpenAI provider. Credentials from AiSettings (per-user) or env vars.
 * User's settings in Settings take precedence over env when set.
 */
export async function getProvider(userId?: string): Promise<AIProvider | null> {
  let apiKey: string | undefined;
  let endpoint: string | undefined;
  let deployment: string | undefined;
  if (userId) {
    const settings = await prisma.aiSettings.findUnique({
      where: { userId },
    });
    apiKey = settings?.openRouterKey?.trim();
    endpoint = settings?.azureEndpoint?.trim();
    deployment = settings?.azureDeployment?.trim();
  }
  if (!apiKey) apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  if (!endpoint) endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!deployment) deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  if (!apiKey || !endpoint) return null;
  return createAzureProvider(apiKey, endpoint, deployment || undefined);
}

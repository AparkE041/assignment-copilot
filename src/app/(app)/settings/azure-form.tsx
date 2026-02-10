"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";
import { safeJson } from "@/lib/safe-json";

export function AzureForm() {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/ai/azure")
      .then((res) =>
        safeJson<{ configured?: boolean; endpoint?: string; deployment?: string }>(res),
      )
      .then((data) => {
        setConfigured(!!data.configured);
        if (data.endpoint) setEndpoint(data.endpoint);
        if (data.deployment) setDeployment(data.deployment);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpoint.trim() || null,
          apiKey: apiKey.trim() || null,
          deployment: deployment.trim() || null,
        }),
      });
      const data = await safeJson<{ error?: string }>(res);
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
        return;
      }
      const hasConfig = !!(endpoint.trim() && apiKey.trim());
      setConfigured(hasConfig);
      setMessage({
        type: "success",
        text: hasConfig ? "Azure OpenAI settings saved." : "Settings cleared.",
      });
      if (apiKey.trim()) setApiKey("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="azure-endpoint">Endpoint URL</Label>
        <Input
          id="azure-endpoint"
          type="url"
          placeholder="https://YOUR-RESOURCE.openai.azure.com/"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          disabled={loading}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="azure-key">API Key</Label>
        <Input
          id="azure-key"
          type="password"
          placeholder={configured ? "••••••••" : "Your Azure OpenAI API key"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={loading}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="azure-deployment">Deployment Name</Label>
        <Input
          id="azure-deployment"
          type="text"
          placeholder="gpt-41"
          value={deployment}
          onChange={(e) => setDeployment(e.target.value)}
          disabled={loading}
          className="rounded-xl"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Use{" "}
        <a
          href="https://ai.azure.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          Azure AI Foundry
        </a>{" "}
        to create a project, deploy a model (e.g. GPT-4.1), and get your endpoint, API key, and deployment name.
      </p>
      <Button type="submit" disabled={loading} className="rounded-xl">
        {loading ? "Saving..." : configured && !apiKey.trim() ? "Clear" : "Save"}
      </Button>
      {message && (
        <FormMessage type={message.type}>
          {message.text}
        </FormMessage>
      )}
    </form>
  );
}

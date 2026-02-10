"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

type CheckStatus = "pass" | "warn" | "fail";

interface ReadinessCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
}

interface ReadinessResponse {
  readyForDeployment: boolean;
  failures: number;
  warnings: number;
  checkedAt: string;
  checks: ReadinessCheck[];
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
  return <XCircle className="w-4 h-4 text-red-600" />;
}

export function DeploymentReadiness() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deployment/readiness", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load deployment readiness checks.");
        return;
      }
      setData(json as ReadinessResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load deployment readiness checks."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (!data) return null;
    if (data.readyForDeployment && data.warnings === 0) {
      return { type: "success" as const, text: "All deployment checks passed." };
    }
    if (data.failures > 0) {
      return {
        type: "error" as const,
        text: `${data.failures} blocking issue${data.failures === 1 ? "" : "s"} found.`,
      };
    }
    return {
      type: "info" as const,
      text: `${data.warnings} warning${data.warnings === 1 ? "" : "s"} to review before deploy.`,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Live checks for environment variables, integrations, and connectivity.
          </p>
          {data?.checkedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last checked: {new Date(data.checkedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-2"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <FormMessage type="error">{error}</FormMessage>}
      {!error && summary && <FormMessage type={summary.type}>{summary.text}</FormMessage>}

      {loading && (
        <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
          Running deployment checks...
        </div>
      )}

      {!loading && data && (
        <ul className="space-y-2">
          {data.checks.map((check) => (
            <li
              key={check.id}
              className="rounded-xl border border-border/70 bg-secondary/30 p-3"
            >
              <div className="flex items-start gap-3">
                <StatusIcon status={check.status} />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                  {check.action && (
                    <p className="text-xs text-foreground/80">Action: {check.action}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

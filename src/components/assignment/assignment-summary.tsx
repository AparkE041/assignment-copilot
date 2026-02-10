"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import {
  Sparkles,
  ClipboardList,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";

export interface AssignmentSummaryData {
  summary?: string;
  deliverables: string[];
  constraints: string[];
  rubricHighlights: string[];
  questionsForInstructor: string[];
  estimatedMinutes?: number | null;
  rawText?: string;
}

interface Props {
  assignmentId: string;
  summary: AssignmentSummaryData;
  descriptionHtml: string | null;
}

export function AssignmentSummary({ assignmentId, summary: initial, descriptionHtml }: Props) {
  const [data, setData] = useState<AssignmentSummaryData>(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const hasContent =
    !!data.summary ||
    data.deliverables.length > 0 ||
    data.constraints.length > 0 ||
    data.rubricHighlights.length > 0 ||
    data.questionsForInstructor.length > 0;

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/ai-summary`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: result.error ?? "Generation failed" });
        return;
      }
      setData((prev) => ({
        ...prev,
        summary: result.summary || prev.summary,
        deliverables: result.deliverables?.length ? result.deliverables : prev.deliverables,
        constraints: result.constraints?.length ? result.constraints : prev.constraints,
        estimatedMinutes: result.estimatedMinutes ?? prev.estimatedMinutes,
      }));
      const parts: string[] = ["Summary generated"];
      if (result.checklistCount > 0) parts.push(`${result.checklistCount} checklist items created`);
      if (result.estimatedMinutes) parts.push(`estimated ${result.estimatedMinutes} min effort`);
      setMessage({ type: "success", text: parts.join(". ") + "." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-xl gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading
            ? "Generating..."
            : hasContent
              ? "Re-generate with AI"
              : "Generate summary with AI"}
        </Button>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>

      {/* AI summary paragraph */}
      {data.summary && (
        <Card className="glass border-0 rounded-2xl shadow-apple">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{data.summary}</p>
            {data.estimatedMinutes != null && data.estimatedMinutes > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Estimated effort: <strong className="text-foreground">{data.estimatedMinutes} minutes</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      {data.deliverables.length > 0 && (
        <Card className="glass border-0 rounded-2xl shadow-apple">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{d}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Constraints */}
      {data.constraints.length > 0 && (
        <Card className="glass border-0 rounded-2xl shadow-apple">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Constraints &amp; Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <span className="text-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasContent && !loading && (
        <Card className="glass border-0 rounded-2xl shadow-apple">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-foreground font-medium">
                No summary yet
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Click <strong>Generate summary with AI</strong> above to create a summary,
                identify deliverables, and auto-generate checklist items for this assignment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

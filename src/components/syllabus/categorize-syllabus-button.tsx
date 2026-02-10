"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Sparkles } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

interface CategorizeSyllabusButtonProps {
  courseId: string;
  hasExtractedText: boolean;
  hasSections: boolean;
}

export function CategorizeSyllabusButton({
  courseId,
  hasExtractedText,
  hasSections,
}: CategorizeSyllabusButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!hasExtractedText) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/categorize-syllabus`, {
        method: "POST",
      });
      const data = await safeJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? "Categorization failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl gap-2"
        onClick={handleClick}
        disabled={loading}
      >
        <Sparkles className="w-4 h-4" />
        {loading
          ? "Categorizing..."
          : hasSections
            ? "Re-categorize with AI"
            : "Categorize with AI"}
      </Button>
      {error && (
        <FormMessage type="error">{error}</FormMessage>
      )}
    </div>
  );
}

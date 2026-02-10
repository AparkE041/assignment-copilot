"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { FileDown } from "lucide-react";
import { safeJson } from "@/lib/safe-json";

interface ExtractSyllabusButtonProps {
  courseId: string;
  hasSyllabusHtml: boolean;
  hasSyllabusExtracted: boolean;
}

export function ExtractSyllabusButton({
  courseId,
  hasSyllabusHtml,
  hasSyllabusExtracted,
}: ExtractSyllabusButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (hasSyllabusExtracted || !hasSyllabusHtml) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/extract-syllabus`, {
        method: "POST",
      });
      const data = await safeJson<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? "Extraction failed");
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
    <div className="mt-4 space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl gap-2"
        onClick={handleClick}
        disabled={loading}
      >
        <FileDown className="w-4 h-4" />
        {loading ? "Extracting..." : "Extract syllabus from linked file"}
      </Button>
      {error && (
        <FormMessage type="error">{error}</FormMessage>
      )}
    </div>
  );
}

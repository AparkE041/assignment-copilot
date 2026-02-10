"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { parseSyllabusIntoSections } from "@/lib/syllabus/parse-sections";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface SyllabusSection {
  id: string;
  title: string;
  content: string;
}

interface SyllabusDashboardProps {
  text: string;
  sections?: SyllabusSection[] | null;
}

export function SyllabusDashboard({ text, sections: aiSections }: SyllabusDashboardProps) {
  const parsed = aiSections?.length
    ? aiSections
    : parseSyllabusIntoSections(text);
  const [selectedId, setSelectedId] = useState<string>(parsed[0]?.id ?? "");
  const selected = parsed.find((s) => s.id === selectedId) ?? parsed[0];

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/30">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-between font-medium h-10 rounded-xl"
            >
              {selected?.title ?? "Select section"}
              <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto">
            {parsed.map((section) => (
              <DropdownMenuItem
                key={section.id}
                onClick={() => setSelectedId(section.id)}
              >
                {section.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {selected && (
        <div className="px-4 py-4">
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
            {selected.content}
          </div>
        </div>
      )}
    </div>
  );
}

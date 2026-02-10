/**
 * Parse syllabus text into sections for dashboard display.
 * Looks for common section headers and splits content accordingly.
 */

export interface SyllabusSection {
  id: string;
  title: string;
  content: string;
}

const SECTION_PATTERNS = [
  { id: "description", title: "Course Description", pattern: /^(?:course\s+)?description$/i },
  { id: "objectives", title: "Objectives", pattern: /^(?:learning\s+)?objectives?$/i },
  { id: "grading", title: "Grading", pattern: /^grading(?:\s+policy)?$/i },
  { id: "schedule", title: "Schedule", pattern: /^(?:course\s+)?schedule$/i },
  { id: "policies", title: "Policies", pattern: /^(?:course\s+)?policies?$/i },
  { id: "due-dates", title: "Due Dates", pattern: /^due\s+dates?$/i },
  { id: "assignments", title: "Assignments", pattern: /^assignments?/i },
  { id: "materials", title: "Materials", pattern: /^(?:required\s+)?materials?$/i },
  { id: "textbooks", title: "Textbooks", pattern: /^textbooks?$/i },
  { id: "instructor", title: "Instructor", pattern: /^instructor|contact|professor$/i },
  { id: "prerequisites", title: "Prerequisites", pattern: /^prerequisites?$/i },
  { id: "attendance", title: "Attendance", pattern: /^attendance$/i },
  { id: "late-work", title: "Late Work", pattern: /^late\s+work|late\s+policy$/i },
  { id: "academic-integrity", title: "Academic Integrity", pattern: /^academic\s+integrity$/i },
  { id: "calendar", title: "Calendar", pattern: /^calendar$/i },
  { id: "overview", title: "Overview", pattern: /^overview$/i },
  { id: "evaluation", title: "Evaluation", pattern: /^evaluation$/i },
];

function normalizeLine(line: string): string {
  return line.trim().replace(/[:：]\s*$/, "");
}

function looksLikeSectionHeader(line: string): { id: string; title: string } | null {
  const normalized = normalizeLine(line);
  if (normalized.length < 3 || normalized.length > 80) return null;
  for (const s of SECTION_PATTERNS) {
    if (s.pattern.test(normalized)) {
      return { id: s.id, title: normalized };
    }
  }
  // Lines that are ALL CAPS and short might be headers
  if (normalized === normalized.toUpperCase() && normalized.length < 50 && !normalized.includes(".")) {
    return {
      id: normalized.toLowerCase().replace(/\s+/g, "-").slice(0, 30),
      title: normalized,
    };
  }
  return null;
}

export function parseSyllabusIntoSections(text: string): SyllabusSection[] {
  const lines = text.split(/\r?\n/);
  const sections: SyllabusSection[] = [];
  let currentSection: { id: string; title: string; content: string[] } | null = null;
  const pendingContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const header = looksLikeSectionHeader(line);

    if (header) {
      if (currentSection) {
        const content = currentSection.content.join("\n").trim();
        if (content) {
          sections.push({
            id: currentSection.id,
            title: currentSection.title,
            content,
          });
        }
      }
      currentSection = {
        id: header.id,
        title: header.title,
        content: [],
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    } else {
      pendingContent.push(line);
    }
  }

  if (currentSection) {
    const content = currentSection.content.join("\n").trim();
    if (content) {
      sections.push({
        id: currentSection.id,
        title: currentSection.title,
        content,
      });
    }
  }

  const intro = pendingContent.join("\n").trim();
  if (intro && sections.length > 0) {
    sections.unshift({
      id: "intro",
      title: "Overview",
      content: intro,
    });
  } else if (intro) {
    sections.push({
      id: "content",
      title: "Syllabus",
      content: intro,
    });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      id: "full",
      title: "Syllabus",
      content: text.trim(),
    });
  }

  return sections;
}

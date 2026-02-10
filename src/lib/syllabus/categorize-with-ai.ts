/**
 * Use Azure OpenAI to categorize raw syllabus text into structured sections.
 */

import { AzureOpenAI } from "openai";

export interface SyllabusSection {
  id: string;
  title: string;
  content: string;
}

export interface AzureConfig {
  apiKey: string;
  endpoint?: string;
  deployment?: string;
}

const SYSTEM_PROMPT = `You are a syllabus parser. Given raw syllabus text extracted from a PDF or DOCX, extract and organize it into distinct sections.

Return a JSON array of objects, each with:
- id: kebab-case identifier (e.g. "course-description", "grading-policy", "schedule")
- title: human-readable section title (e.g. "Course Description", "Grading Policy", "Schedule")
- content: the text content for that section, trimmed

Use these standard section IDs when applicable:
- course-description / overview
- objectives / learning-outcomes
- grading / grading-policy
- schedule / calendar / due-dates
- assignments
- materials / textbooks
- instructor / contact
- prerequisites
- attendance
- late-work / late-policy
- academic-integrity
- policies

Create custom ids for other sections (e.g. "office-hours", "course-modules").
Keep content intact; do not summarize. If the syllabus has no clear sections, use one section with id "syllabus" and title "Syllabus".
Respond ONLY with valid JSON array, no markdown or explanation.`;

export async function categorizeSyllabusWithAi(
  text: string,
  config: AzureConfig,
): Promise<SyllabusSection[]> {
  const apiKey = config.apiKey.replace(/[^\x00-\x7F]/g, "").trim();
  if (!apiKey) throw new Error("Invalid API key");

  const endpoint =
    config.endpoint?.trim() || process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!endpoint) throw new Error("Azure endpoint required");

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  });

  const deployment =
    config.deployment?.trim() ||
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    "gpt-41";

  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Categorize this syllabus:\n\n${text.slice(0, 80000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 16_384,
  });

  const rawContent = completion.choices[0]?.message?.content?.trim();
  if (!rawContent) throw new Error("Empty response from AI");

  const cleaned = rawContent.replace(/^```json\s*|\s*```$/g, "").trim();
  // Sanitize control chars only inside string literals (LLMs emit raw newlines in "content" etc.)
  function sanitizeJsonStrings(s: string): string {
    let out = "";
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '"') {
        out += c;
        i++;
        while (i < s.length) {
          const d = s[i];
          if (d === "\\") {
            out += d + (s[i + 1] ?? "");
            i += 2;
            continue;
          }
          if (d === '"') {
            out += d;
            i++;
            break;
          }
          if (d === "\n") out += "\\n";
          else if (d === "\r") out += "\\r";
          else if (d === "\t") out += "\\t";
          else if (d.charCodeAt(0) < 32) out += `\\u${d.charCodeAt(0).toString(16).padStart(4, "0")}`;
          else out += d;
          i++;
        }
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }
  const parsed = JSON.parse(sanitizeJsonStrings(cleaned)) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI returned no sections");
  }

  return parsed
    .filter((s): s is SyllabusSection => s && typeof (s as SyllabusSection).id === "string" && typeof (s as SyllabusSection).title === "string")
    .map((s) => ({
      id: String(s.id).replace(/\s+/g, "-").slice(0, 50),
      title: String(s.title).slice(0, 100),
      content: String(s.content ?? "").trim().slice(0, 50000),
    }));
}

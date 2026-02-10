import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AzureOpenAI } from "openai";
import { decryptSecret } from "@/lib/secret-crypto";

/**
 * POST /api/assignments/:id/ai-summary
 * Uses Azure OpenAI to generate a structured summary + checklist for an assignment.
 * Stores checklist items in the database.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const assignment = await prisma.assignment.findFirst({
    where: { id, course: { userId } },
    include: {
      attachments: { select: { extractedText: true } },
      checklistItems: { select: { id: true } },
    },
  });

  if (!assignment)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build full text from description + attachments
  const { htmlToText } = await import("@/lib/parsers/html-to-text");
  const descText = assignment.descriptionHtml
    ? htmlToText(assignment.descriptionHtml)
    : "";
  const attachmentTexts = assignment.attachments
    .map((a) => a.extractedText)
    .filter(Boolean) as string[];
  const fullText = [descText, ...attachmentTexts].filter(Boolean).join("\n\n");

  if (!fullText.trim())
    return NextResponse.json(
      { error: "No assignment description text to analyze." },
      { status: 400 },
    );

  // Get Azure credentials
  const settings = await prisma.aiSettings.findUnique({ where: { userId } });
  const apiKey =
    decryptSecret(settings?.openRouterKey)?.trim() ??
    process.env.AZURE_OPENAI_API_KEY?.trim();
  const endpoint =
    settings?.azureEndpoint?.trim() ??
    process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const deployment =
    settings?.azureDeployment?.trim() ??
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ??
    "gpt-41";

  if (!apiKey || !endpoint)
    return NextResponse.json(
      { error: "Configure Azure OpenAI in Settings first." },
      { status: 400 },
    );

  try {
    const client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    });

    const systemPrompt = `You are a study assistant. Given an assignment description, produce a JSON object with these fields:

{
  "summary": "A 2-3 sentence plain-language summary of what the assignment asks the student to do.",
  "deliverables": ["List of specific things the student must submit"],
  "constraints": ["Format requirements, word counts, citation styles, etc."],
  "estimatedMinutes": <number – your best estimate of total effort in minutes>,
  "checklist": ["Step-by-step action items the student should complete, in order, 5-10 items"]
}

Rules:
- Be specific and actionable
- Checklist items should be concrete steps (e.g. "Read chapter 5" not "Do research")
- estimatedMinutes should be realistic for a college student
- Respond ONLY with valid JSON, no markdown or explanation`;

    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Assignment title: ${assignment.title}\n\nDescription:\n${fullText.slice(0, 6000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parse JSON from response
    let parsed: {
      summary?: string;
      deliverables?: string[];
      constraints?: string[];
      estimatedMinutes?: number;
      checklist?: string[];
    };
    try {
      // Try to extract JSON from the response (handle markdown code fences)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    // Save checklist items to DB (only if assignment has no existing items)
    if (
      Array.isArray(parsed.checklist) &&
      parsed.checklist.length > 0 &&
      assignment.checklistItems.length === 0
    ) {
      await prisma.checklistItem.createMany({
        data: parsed.checklist.map((title, idx) => ({
          assignmentId: id,
          title: String(title).slice(0, 500),
          order: idx,
          checked: false,
        })),
      });
    }

    // Update estimated effort in local state
    if (parsed.estimatedMinutes && parsed.estimatedMinutes > 0) {
      await prisma.assignmentLocalState.upsert({
        where: { assignmentId: id },
        create: {
          assignmentId: id,
          estimatedEffortMinutes: parsed.estimatedMinutes,
          status: "not_started",
        },
        update: {
          estimatedEffortMinutes: parsed.estimatedMinutes,
        },
      });
    }

    return NextResponse.json({
      summary: parsed.summary ?? "",
      deliverables: parsed.deliverables ?? [],
      constraints: parsed.constraints ?? [],
      estimatedMinutes: parsed.estimatedMinutes ?? null,
      checklistCount: parsed.checklist?.length ?? 0,
    });
  } catch (err) {
    console.error("AI summary error:", err);
    const message =
      err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

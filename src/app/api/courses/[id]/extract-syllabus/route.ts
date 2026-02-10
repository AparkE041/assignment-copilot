import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { fetchCourseWithSyllabus } from "@/lib/canvas/client";
import {
  extractSyllabusFromLinkedFiles,
  extractSyllabusFromCourseFiles,
} from "@/lib/syllabus/extract-from-file";
import { categorizeSyllabusWithAi } from "@/lib/syllabus/categorize-with-ai";
import { decryptSecret } from "@/lib/secret-crypto";

const CANVAS_BASE =
  process.env.CANVAS_BASE_URL ?? "https://canvas.instructure.com";

/**
 * On-demand syllabus extraction for a course.
 * Runs when user clicks "Extract syllabus from file" on class detail page.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: session.user.id },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const connection = await prisma.canvasConnection.findUnique({
    where: { userId: session.user.id },
  });
  const token =
    decryptSecret(connection?.accessToken)?.trim() ??
    process.env.CANVAS_PAT?.trim() ??
    null;
  if (!token) {
    return NextResponse.json(
      { error: "No Canvas token. Connect Canvas in Settings." },
      { status: 400 }
    );
  }

  try {
    const canvasCourseId = course.canvasId;
    // Fetch fresh syllabus from Canvas (rawPayload may be stale)
    const freshCourse = await fetchCourseWithSyllabus(course.canvasId, token);
    const syllabusBody =
      typeof (freshCourse as Record<string, unknown>)?.syllabus_body === "string"
        ? ((freshCourse as Record<string, unknown>).syllabus_body as string)
        : typeof (course.rawPayload as Record<string, unknown>)?.syllabus_body === "string"
          ? ((course.rawPayload as Record<string, unknown>).syllabus_body as string)
          : null;

    let extracted: string | null = null;

    // 1. Try syllabus_body links first (single-file API works even when list 403s)
    if (syllabusBody?.trim()) {
      extracted = await extractSyllabusFromLinkedFiles(
        syllabusBody,
        CANVAS_BASE,
        token,
        canvasCourseId
      );
    }

    // 2. Fallback: fetch course files and look for syllabus-like documents
    if (!extracted) {
      extracted = await extractSyllabusFromCourseFiles(
        canvasCourseId,
        CANVAS_BASE,
        token
      );
    }

    if (!extracted) {
      return NextResponse.json(
        {
          error:
            "Could not extract syllabus. No syllabus-linked PDF/DOCX found in Canvas, and no syllabus-named file in course files.",
        },
        { status: 422 }
      );
    }

    await prisma.course.update({
      where: { id: courseId },
      data: { syllabusExtractedText: extracted, syllabusSections: Prisma.JsonNull },
    });

    // Auto-categorize with AI if Azure credentials are configured
    const aiSettings = await prisma.aiSettings.findUnique({
      where: { userId: session.user.id },
    });
    const apiKey =
      decryptSecret(aiSettings?.openRouterKey)?.trim() ??
      process.env.AZURE_OPENAI_API_KEY?.trim();
    const endpoint = aiSettings?.azureEndpoint?.trim() ?? process.env.AZURE_OPENAI_ENDPOINT?.trim();
    const deployment = aiSettings?.azureDeployment?.trim() ?? process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
    if (apiKey && endpoint) {
      try {
        const sections = await categorizeSyllabusWithAi(extracted, { apiKey, endpoint, deployment });
        await prisma.course.update({
          where: { id: courseId },
          data: { syllabusSections: sections as object },
        });
      } catch {
        // Ignore categorize errors; syllabus is still extracted
      }
    }

    return NextResponse.json({ success: true, text: extracted.slice(0, 500) });
  } catch (err) {
    console.error("Syllabus extraction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}

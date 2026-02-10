import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { categorizeSyllabusWithAi } from "@/lib/syllabus/categorize-with-ai";
import { decryptSecret } from "@/lib/secret-crypto";

/**
 * POST /api/courses/[id]/categorize-syllabus - Use AI to categorize syllabus into sections
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

  const text = course.syllabusExtractedText?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "No syllabus text to categorize. Extract syllabus first." },
      { status: 400 }
    );
  }

  const aiSettings = await prisma.aiSettings.findUnique({
    where: { userId: session.user.id },
  });
  const apiKey =
    decryptSecret(aiSettings?.openRouterKey)?.trim() ??
    process.env.AZURE_OPENAI_API_KEY?.trim();
  const endpoint = aiSettings?.azureEndpoint?.trim() ?? process.env.AZURE_OPENAI_ENDPOINT?.trim();
  if (!apiKey || !endpoint) {
    return NextResponse.json(
      { error: "Configure Azure OpenAI in Settings (endpoint, API key, deployment)." },
      { status: 400 }
    );
  }

  const deployment = aiSettings?.azureDeployment?.trim() ?? process.env.AZURE_OPENAI_DEPLOYMENT?.trim();

  try {
    const valid = await categorizeSyllabusWithAi(text, { apiKey, endpoint, deployment });

    await prisma.course.update({
      where: { id: courseId },
      data: { syllabusSections: valid as object },
    });

    return NextResponse.json({
      success: true,
      sections: valid.length,
    });
  } catch (err) {
    console.error("Syllabus categorize error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Categorization failed" },
      { status: 500 }
    );
  }
}

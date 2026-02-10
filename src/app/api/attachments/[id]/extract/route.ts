import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/parsers/pdf";
import { extractTextFromDocx } from "@/lib/parsers/docx";
import { extractTextFromXlsx } from "@/lib/parsers/xlsx";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: { id },
    include: {
      assignment: { include: { course: true } },
    },
  });

  if (!attachment || attachment.assignment.course.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attachment.extractionStatus === "completed" && attachment.extractedText) {
    return NextResponse.json({
      status: "completed",
      text: attachment.extractedText,
    });
  }

  await prisma.attachment.update({
    where: { id },
    data: { extractionStatus: "processing" },
  });

  try {
    const res = await fetch(attachment.url, {
      headers: { "User-Agent": "AssignmentCopilot/1.0" },
    });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = (attachment.mime ?? "").toLowerCase();

    let text = "";
    if (mime.includes("pdf")) {
      const result = await extractTextFromPdf(buffer);
      text = result.text;
    } else if (
      mime.includes("word") ||
      mime.includes("document") ||
      attachment.filename?.endsWith(".docx")
    ) {
      text = await extractTextFromDocx(buffer);
    } else if (
      mime.includes("spreadsheet") ||
      mime.includes("excel") ||
      attachment.filename?.endsWith(".xlsx")
    ) {
      const result = await extractTextFromXlsx(buffer);
      text = result.text;
    } else {
      throw new Error(`Unsupported type: ${mime || attachment.filename}`);
    }

    await prisma.attachment.update({
      where: { id },
      data: {
        extractedText: text.slice(0, 100_000),
        extractionStatus: "completed",
      },
    });

    return NextResponse.json({
      status: "completed",
      text: text.slice(0, 10_000),
    });
  } catch (err) {
    await prisma.attachment.update({
      where: { id },
      data: {
        extractionStatus: "failed",
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}

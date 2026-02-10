import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractSyllabusDiagnostic } from "@/lib/syllabus/extract-from-file";

const CANVAS_BASE =
  process.env.CANVAS_BASE_URL ?? "https://belmont.instructure.com";

/**
 * Debug endpoint to see what Canvas returns for syllabus extraction.
 * GET /api/courses/[id]/syllabus-debug
 */
export async function GET(
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
  const token = connection?.accessToken ?? process.env.CANVAS_PAT ?? null;
  if (!token) {
    return NextResponse.json(
      { error: "No Canvas token" },
      { status: 400 }
    );
  }

  const raw = course.rawPayload as Record<string, unknown> | null;
  const syllabusBody =
    typeof raw?.syllabus_body === "string" ? raw.syllabus_body : null;

  // Extract links from syllabus_body (raw hrefs)
  const linkMatches = syllabusBody?.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) ?? [];
  const links = linkMatches.map((m) => {
    const href = m.match(/href=["']([^"']+)["']/i)?.[1];
    return href ?? "";
  }).filter(Boolean);

  // Decode HTML entities for fetch (e.g. &amp; -> &)
  const decodeHref = (s: string) =>
    s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const decodedLinks = links.map(decodeHref);

  // Extract file ID from first Canvas file link
  const firstLink = decodedLinks[0];
  const fileIdMatch = firstLink?.match(/\/files\/(\d+)(?:\?|$|\/)/i);
  const fileId = fileIdMatch?.[1];

  const base = CANVAS_BASE.replace(/\/$/, "");

  // 1. Fetch course files LIST from Canvas API
  const filesRes = await fetch(
    `${base}/api/v1/courses/${course.canvasId}/files?per_page=50&sort=display_name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const filesData = await filesRes.json();
  const files = Array.isArray(filesData) ? filesData : (filesData as { files?: unknown[] })?.files ?? [];
  const fileNames = (files as Array<{ display_name?: string; filename?: string }>).map(
    (f) => f.display_name ?? f.filename ?? "(unknown)"
  );

  // 2. Single-file API (GET /courses/:id/files/:file_id) - different scope, may work when list 403s
  let singleFileApiStatus: number | null = null;
  let singleFileApiOk = false;
  let singleFileDownloadUrl: string | null = null;
  let downloadUrlFetch: { status: number; contentType: string; ok: boolean } | null = null;
  if (fileId) {
    const singleRes = await fetch(
      `${base}/api/v1/courses/${course.canvasId}/files/${fileId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    singleFileApiStatus = singleRes.status;
    singleFileApiOk = singleRes.ok;
    let actualDownloadUrl: string | null = null;
    if (singleRes.ok) {
      const singleData = (await singleRes.json()) as { url?: string };
      actualDownloadUrl = typeof singleData.url === "string" ? singleData.url : null;
      singleFileDownloadUrl = actualDownloadUrl ? "(present)" : null;
    }

    // Fetch the API-returned download URL (same as extractor does) - what do we get?
    if (actualDownloadUrl) {
      try {
        const dr = await fetch(actualDownloadUrl, {
          headers: { "User-Agent": "AssignmentCopilot/1.0" },
          redirect: "follow",
        });
        downloadUrlFetch = {
          status: dr.status,
          contentType: dr.headers.get("content-type") ?? "(none)",
          ok: dr.ok,
        };
      } catch (e) {
        downloadUrlFetch = { status: 0, contentType: String(e), ok: false };
      }
    }
  }

  // 3. Direct fetch of syllabus link WITH Bearer
  let directWithBearer: { status: number; contentType: string; ok: boolean } | null = null;
  if (firstLink && (firstLink.startsWith("http") || firstLink.startsWith("/"))) {
    const fetchUrl = firstLink.startsWith("/") ? `${base}${firstLink}` : firstLink;
    try {
      const dr = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "AssignmentCopilot/1.0" },
        redirect: "follow",
      });
      directWithBearer = {
        status: dr.status,
        contentType: dr.headers.get("content-type") ?? "(none)",
        ok: dr.ok,
      };
    } catch (e) {
      directWithBearer = { status: 0, contentType: String(e), ok: false };
    }
  }

  // 4. Direct fetch of syllabus link WITHOUT Bearer (verifier URLs sometimes work as signed URLs)
  let directNoBearer: { status: number; contentType: string; ok: boolean } | null = null;
  if (firstLink && (firstLink.startsWith("http") || firstLink.startsWith("/"))) {
    const fetchUrl = firstLink.startsWith("/") ? `${base}${firstLink}` : firstLink;
    try {
      const dr = await fetch(fetchUrl, {
        headers: { "User-Agent": "AssignmentCopilot/1.0" },
        redirect: "follow",
      });
      directNoBearer = {
        status: dr.status,
        contentType: dr.headers.get("content-type") ?? "(none)",
        ok: dr.ok,
      };
    } catch (e) {
      directNoBearer = { status: 0, contentType: String(e), ok: false };
    }
  }

  // Run full extraction with diagnostic
  let extractionResult: Awaited<ReturnType<typeof extractSyllabusDiagnostic>> | null = null;
  if (syllabusBody?.trim() && token) {
    extractionResult = await extractSyllabusDiagnostic(
      syllabusBody,
      base,
      token,
      course.canvasId
    );
  }

  return NextResponse.json({
    courseId,
    canvasCourseId: course.canvasId,
    syllabusBodyLength: syllabusBody?.length ?? 0,
    syllabusBodyHasContent: !!syllabusBody?.trim(),
    linksFromSyllabusBody: links,
    decodedFirstLink: decodedLinks[0] ?? null,
    extractedFileId: fileId ?? null,
    filesApiStatus: filesRes.status,
    filesApiOk: filesRes.ok,
    singleFileApiStatus,
    singleFileApiOk,
    singleFileDownloadUrl: singleFileDownloadUrl ? "(present)" : null,
    downloadUrlFetch,
    directFetchWithBearer: directWithBearer,
    directFetchNoBearer: directNoBearer,
    extractionResult,
    filesCount: Array.isArray(files) ? files.length : 0,
    fileNames: fileNames.slice(0, 30),
    rawFilesType: Array.isArray(filesData) ? "array" : typeof filesData,
  });
}

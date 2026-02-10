/**
 * Extract syllabus text from linked PDF/DOCX files in Canvas syllabus_body HTML.
 * Canvas often embeds syllabus as a link (e.g. <a href=".../files/.../download">Syllabus.pdf</a>).
 * Canvas web download URLs don't accept Bearer token; we use the Files API to get a pre-signed URL.
 */

import { extractTextFromPdf } from "@/lib/parsers/pdf";
import { extractTextFromDocx } from "@/lib/parsers/docx";
import { extractTextFromXlsx } from "@/lib/parsers/xlsx";

const FILE_EXT_PATTERN = /\.(pdf|docx?|xlsx?)(\?|$)/i;
// Permissive: href before/after other attrs, single/double quotes, whitespace
const LINK_HREF_PATTERN = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
// Canvas file URLs: /files/123/download, /courses/456/files/123/download, /files/123
const CANVAS_FILE_ID_PATTERN =
  /\/files\/(\d+)(?:\/(?:download|preview|file_contents))?(?:\?|$)/i;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function extractLinksFromHtml(html: string): string[] {
  const urls: string[] = [];
  // Primary: extract from <a href="...">
  let m: RegExpExecArray | null;
  const re = new RegExp(LINK_HREF_PATTERN.source, "gi");
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:")) continue;
    urls.push(decodeHtmlEntities(raw));
  }
  // Fallback: find any URL containing /files/ID in the HTML (Canvas embeds links in various ways)
  // Matches /files/ID, /files/ID/download, /files/ID?verifier=... (common in syllabus_body)
  const fileUrlMatches = html.matchAll(
    /https?:\/\/[^\s"'<>]+?\/files\/\d+(?:\/(?:download|preview|file_contents))?(?:\?[^\s"'<>]*)?/gi
  );
  for (const match of fileUrlMatches) {
    const url = decodeHtmlEntities(match[0]);
    if (!urls.includes(url)) urls.push(url);
  }
  // Also match /files/ID?query (no download path - common in syllabus links)
  const fileIdQueryMatches = html.matchAll(
    /https?:\/\/[^\s"'<>]+?\/files\/\d+\?[^\s"'<>]+/gi
  );
  for (const match of fileIdQueryMatches) {
    const url = decodeHtmlEntities(match[0]);
    if (!urls.includes(url)) urls.push(url);
  }
  const relMatches = html.matchAll(
    /\/courses\/\d+\/files\/\d+(?:\/(?:download|preview|file_contents))?(?:\?[^\s"'<>]*)?/gi
  );
  // Also match /files/ID without /courses/ prefix (with or without query)
  const shortFileMatches = html.matchAll(
    /(?<![\/\w])\/files\/\d+(?:\/(?:download|preview|file_contents))?(?:\?[^\s"'<>]*)?/gi
  );
  for (const match of relMatches) {
    const url = decodeHtmlEntities(match[0]);
    if (!urls.includes(url)) urls.push(url);
  }
  for (const match of shortFileMatches) {
    const url = decodeHtmlEntities(match[0]);
    if (!urls.includes(url)) urls.push(url);
  }
  return [...new Set(urls)];
}

function looksLikeSyllabusFile(url: string): boolean {
  if (FILE_EXT_PATTERN.test(url)) return true;
  if (CANVAS_FILE_ID_PATTERN.test(url)) return true;
  // Any URL with /files/ in path (Canvas file) - more permissive
  if (/\/files\/\d+/i.test(url)) return true;
  return false;
}

/** Extract Canvas file ID from URL like /courses/123/files/456/download or /files/456?verifier=... */
function extractCanvasFileId(url: string): string | null {
  const m = url.match(CANVAS_FILE_ID_PATTERN);
  if (m) return m[1];
  // Also match /files/ID?query (no download/preview path - common in syllabus links)
  const m2 = url.match(/\/files\/(\d+)(?:\?|$)/i);
  return m2 ? m2[1] : null;
}

/** Use Canvas Files API to get a downloadable URL. Course-scoped works better for course files. */
async function getCanvasFileDownloadUrl(
  fileId: string,
  canvasBaseUrl: string,
  accessToken: string,
  canvasCourseId?: string
): Promise<string | null> {
  const base = canvasBaseUrl.replace(/\/$/, "");

  // Try course-scoped first when we have course ID (files in syllabus are course files)
  if (canvasCourseId) {
    const courseUrl = `${base}/api/v1/courses/${canvasCourseId}/files/${fileId}`;
    const courseRes = await fetch(courseUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (courseRes.ok) {
      const data = (await courseRes.json()) as { url?: string };
      if (typeof data.url === "string") return data.url;
    }
  }

  // Fallback to global Files API
  const apiUrl = `${base}/api/v1/files/${fileId}`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return typeof data.url === "string" ? data.url : null;
}

/** Diagnostic: returns where extraction fails. Use for debugging. */
export async function extractSyllabusDiagnostic(
  syllabusBodyHtml: string,
  canvasBaseUrl: string,
  accessToken: string,
  canvasCourseId?: string
): Promise<{
  success: boolean;
  text?: string;
  step: string;
  linksCount?: number;
  apiUrl?: string | null;
  fetchStatus?: number;
  fetchContentType?: string;
  textLength?: number;
  error?: string;
}> {
  const links = extractLinksFromHtml(syllabusBodyHtml);
  if (links.length === 0) {
    return { success: false, step: "extractLinks", linksCount: 0 };
  }

  for (const href of links) {
    if (!looksLikeSyllabusFile(href)) continue;
    let url = href;
    if (url.startsWith("/")) url = new URL(url, canvasBaseUrl).href;
    const canvasFileId = extractCanvasFileId(url);
    if (!canvasFileId) continue;

    const apiUrl = await getCanvasFileDownloadUrl(
      canvasFileId,
      canvasBaseUrl,
      accessToken,
      canvasCourseId
    );
    if (!apiUrl) {
      return { success: false, step: "getApiUrl", linksCount: links.length, apiUrl: null };
    }

    try {
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": "AssignmentCopilot/1.0" },
        redirect: "follow" as const,
      });
      if (!res.ok) {
        return {
          success: false,
          step: "fetch",
          linksCount: links.length,
          apiUrl: "(present)",
          fetchStatus: res.status,
          fetchContentType: res.headers.get("content-type") ?? undefined,
        };
      }
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      const buffer = Buffer.from(await res.arrayBuffer());
      const result = await extractTextFromPdf(buffer);
      const text = result.text ?? "";
      const trimmed = text.trim().slice(0, 100_000);
      if (trimmed.length > 50) {
        return { success: true, text: trimmed, step: "done", textLength: trimmed.length };
      }
      return {
        success: false,
        step: "textTooShort",
        linksCount: links.length,
        apiUrl: "(present)",
        fetchStatus: 200,
        fetchContentType: ct,
        textLength: trimmed.length,
      };
    } catch (e) {
      return {
        success: false,
        step: "extractText",
        linksCount: links.length,
        apiUrl: "(present)",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  return { success: false, step: "noMatchingLinks", linksCount: links.length };
}

export async function extractSyllabusFromLinkedFiles(
  syllabusBodyHtml: string,
  canvasBaseUrl: string,
  accessToken: string,
  canvasCourseId?: string
): Promise<string | null> {
  const links = extractLinksFromHtml(syllabusBodyHtml);
  if (links.length === 0) return null;

  for (const href of links) {
    if (!looksLikeSyllabusFile(href)) continue;

    let url = href;
    if (url.startsWith("/")) {
      url = new URL(url, canvasBaseUrl).href;
    }

    const canvasFileId = extractCanvasFileId(url);

    try {
      let downloadUrl = url;
      if (canvasFileId) {
        // Single-file API works even when list API returns 403. Use it first.
        const apiUrl = await getCanvasFileDownloadUrl(
          canvasFileId,
          canvasBaseUrl,
          accessToken,
          canvasCourseId
        );
        if (apiUrl) {
          downloadUrl = apiUrl;
        } else {
          // Fallback: try direct fetch (syllabus links often return HTML, but worth trying)
          const tryDirectFetch = async (headers: Record<string, string>) => {
            const res = await fetch(url, { headers: { ...headers, "User-Agent": "AssignmentCopilot/1.0" }, redirect: "follow" as const });
            if (!res.ok) return null;
            const ct = (res.headers.get("content-type") ?? "").toLowerCase();
            const contentDisp = res.headers.get("content-disposition") ?? "";
            const fnMatch = contentDisp.match(/filename[^;]*=([^";\n]*)/i);
            const filename = (fnMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "").toLowerCase();
            const isPdf = ct.includes("pdf") || (ct.includes("octet-stream") && filename.endsWith(".pdf"));
            const isDoc = ct.includes("word") || ct.includes("document") || ct.includes("openxml") || filename.endsWith(".docx") || filename.endsWith(".doc");
            if (!isPdf && !isDoc) return null;
            const buffer = Buffer.from(await res.arrayBuffer());
            let text = "";
            if (isPdf || filename.endsWith(".pdf")) {
              const result = await extractTextFromPdf(buffer);
              text = result.text;
            } else {
              text = await extractTextFromDocx(buffer);
            }
            const trimmed = text.trim().slice(0, 100_000);
            return trimmed.length > 50 ? trimmed : null;
          };
          let extracted = await tryDirectFetch({ Authorization: `Bearer ${accessToken}` });
          if (!extracted && url.includes("verifier=")) extracted = await tryDirectFetch({});
          if (extracted) return extracted;
          if (!apiUrl) continue;
        }
      }

      // Fetch the file. API-returned URLs are pre-signed - do NOT send Bearer (Canvas may return HTML instead of raw file).
      const res = await fetch(downloadUrl, {
        headers: { "User-Agent": "AssignmentCopilot/1.0" },
      });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = contentDisposition.match(/filename[^;]*=([^";\n]*)/i);
      const filename = filenameMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

      let text = "";
      if (
        contentType.includes("pdf") ||
        filename.toLowerCase().endsWith(".pdf")
      ) {
        const result = await extractTextFromPdf(buffer);
        text = result.text;
      } else if (
        contentType.includes("word") ||
        contentType.includes("document") ||
        contentType.includes("openxmlformats") ||
        filename.toLowerCase().endsWith(".docx") ||
        filename.toLowerCase().endsWith(".doc")
      ) {
        text = await extractTextFromDocx(buffer);
      } else if (
        contentType.includes("spreadsheet") ||
        contentType.includes("excel") ||
        filename.toLowerCase().endsWith(".xlsx")
      ) {
        const result = await extractTextFromXlsx(buffer);
        text = result.text;
      } else if (
        contentType === "application/octet-stream" &&
        (filename.toLowerCase().endsWith(".docx") ||
          filename.toLowerCase().endsWith(".doc"))
      ) {
        text = await extractTextFromDocx(buffer);
      } else if (
        contentType === "application/octet-stream" &&
        filename.toLowerCase().endsWith(".pdf")
      ) {
        const result = await extractTextFromPdf(buffer);
        text = result.text;
      } else {
        continue;
      }

      const trimmed = text.trim().slice(0, 100_000);
      if (trimmed.length > 50) return trimmed;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Fallback: fetch course files from Canvas API and look for syllabus-like files by name.
 * Use when syllabus_body links fail (e.g. different embed structure).
 */
export async function extractSyllabusFromCourseFiles(
  canvasCourseId: string,
  canvasBaseUrl: string,
  accessToken: string
): Promise<string | null> {
  const base = canvasBaseUrl.replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/v1/courses/${canvasCourseId}/files?per_page=50&sort=display_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  // Canvas may return array directly or wrapped
  const rawFiles = Array.isArray(data) ? data : (data as { files?: unknown[] }).files;
  const files = (Array.isArray(rawFiles) ? rawFiles : []) as Array<{
    id: number;
    display_name?: string;
    filename?: string;
    "content-type"?: string;
    url?: string;
  }>;
  if (files.length === 0) return null;

  const name = (f: { display_name?: string; filename?: string }) =>
    (f.display_name ?? f.filename ?? "").toLowerCase();

  // Priority 1: files with "syllabus", "outline", or "policy" in name
  let toTry = files.filter((f) => {
    const n = name(f);
    return (
      n.includes("syllabus") ||
      n.includes("outline") ||
      n.includes("course policy")
    );
  });

  // Priority 2: any .docx or .pdf (syllabi are often uploaded as these)
  if (toTry.length === 0) {
    toTry = files.filter(
      (f) => name(f).endsWith(".docx") || name(f).endsWith(".pdf")
    );
  }

  for (const file of toTry) {
    const fileId = String(file.id);
    const downloadUrl = await getCanvasFileDownloadUrl(
      fileId,
      canvasBaseUrl,
      accessToken,
      canvasCourseId
    );
    if (!downloadUrl) continue;
    try {
      const fetchRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "AssignmentCopilot/1.0",
        },
      });
      if (!fetchRes.ok) continue;
      const buffer = Buffer.from(await fetchRes.arrayBuffer());
      const contentType = (fetchRes.headers.get("content-type") ?? "").toLowerCase();
      const filename = (file.display_name ?? file.filename ?? "").toLowerCase();
      let text = "";
      if (
        contentType.includes("pdf") ||
        filename.endsWith(".pdf")
      ) {
        const result = await extractTextFromPdf(buffer);
        text = result.text;
      } else if (
        contentType.includes("word") ||
        contentType.includes("document") ||
        contentType.includes("openxmlformats") ||
        filename.endsWith(".docx") ||
        filename.endsWith(".doc")
      ) {
        text = await extractTextFromDocx(buffer);
      } else if (contentType === "application/octet-stream" && (filename.endsWith(".docx") || filename.endsWith(".doc"))) {
        text = await extractTextFromDocx(buffer);
      } else if (contentType === "application/octet-stream" && filename.endsWith(".pdf")) {
        const result = await extractTextFromPdf(buffer);
        text = result.text;
      } else continue;
      const trimmed = text.trim().slice(0, 100_000);
      if (trimmed.length > 50) return trimmed;
    } catch {
      continue;
    }
  }
  return null;
}

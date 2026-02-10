/**
 * Extract text from PDF buffer.
 * Uses unpdf (serverless PDF.js) - works in Next.js/Node without worker file issues.
 */

import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(
  buffer: Buffer
): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return {
    text: text ?? "",
    pages: totalPages ?? 0,
  };
}

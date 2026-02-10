/**
 * Convert HTML to clean plain text.
 * Strips tags, normalizes whitespace.
 */

export function htmlToText(html: string): string {
  if (!html) return "";

  let text = html
    // Remove script/style
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Replace br with newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace block elements with newlines
    .replace(/<\/?(p|div|h[1-6]|li|tr)[^>]*>/gi, "\n")
    // Remove remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Normalize: trim each line, join with newlines
  text = text
    .split(/\s*\n\s*/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return text;
}

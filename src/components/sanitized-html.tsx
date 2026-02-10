/**
 * Sanitized HTML component that safely renders HTML content.
 * Uses DOMPurify to prevent XSS attacks from untrusted sources like Canvas.
 */

"use client";

import DOMPurify from "isomorphic-dompurify";

interface SanitizedHtmlProps {
  html: string;
  className?: string;
  as?: "div" | "span" | "article" | "section";
}

/**
 * Allowed HTML tags for assignment descriptions.
 * Restrictive by default - only common formatting tags.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "ins",
  "mark",
  "small",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "span",
  "div",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "hr",
  "img",
];

/**
 * Allowed attributes for HTML tags.
 */
const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "title",
  "alt",
  "src",
  "width",
  "height",
  "class",
  "id",
  "style",
  "colspan",
  "rowspan",
  "headers",
  "scope",
];

/**
 * Sanitizes HTML content using DOMPurify.
 */
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  });
}

/**
 * Renders sanitized HTML content.
 * Prevents XSS attacks from malicious HTML in assignment descriptions,
 * syllabus content, or other external sources.
 */
export function SanitizedHtml({
  html,
  className,
  as: Component = "div",
}: SanitizedHtmlProps) {
  if (!html || typeof html !== "string") {
    return null;
  }

  const sanitized = sanitizeHtml(html);

  if (!sanitized) {
    return null;
  }

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

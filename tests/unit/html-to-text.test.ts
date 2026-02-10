import { describe, it, expect } from "vitest";
import { htmlToText } from "@/lib/parsers/html-to-text";

describe("htmlToText", () => {
  it("strips HTML tags", () => {
    expect(htmlToText("<p>Hello world</p>")).toBe("Hello world");
  });

  it("converts br to newline", () => {
    expect(htmlToText("Line 1<br/>Line 2")).toBe("Line 1\nLine 2");
  });

  it("decodes entities", () => {
    expect(htmlToText("&amp; &lt; &gt;")).toBe("& < >");
  });

  it("returns empty for empty input", () => {
    expect(htmlToText("")).toBe("");
    expect(htmlToText("   ")).toBe("");
  });
});

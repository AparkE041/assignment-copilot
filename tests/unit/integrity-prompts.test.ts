import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/prompts";

describe("buildSystemPrompt", () => {
  it("includes help_me_learn mode rules", () => {
    const prompt = buildSystemPrompt("Assignment: Write an essay", {
      mode: "help_me_learn",
      neverWriteFinalAnswers: true,
    });
    expect(prompt).toContain("explaining concepts");
    expect(prompt).toContain("NEVER write final answers");
  });

  it("includes drafting_help mode rules", () => {
    const prompt = buildSystemPrompt("Assignment: Write an essay", {
      mode: "drafting_help",
      neverWriteFinalAnswers: true,
    });
    expect(prompt).toContain("drafting");
  });

  it("includes assignment context", () => {
    const ctx = "Submit a 500-word essay on climate change.";
    const prompt = buildSystemPrompt(ctx, {
      mode: "help_me_learn",
      neverWriteFinalAnswers: true,
    });
    expect(prompt).toContain(ctx);
  });
});

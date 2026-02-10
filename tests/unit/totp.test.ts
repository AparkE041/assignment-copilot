import { describe, expect, it } from "vitest";
import {
  buildTotpUri,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/totp";

describe("totp", () => {
  it("generates a valid base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("verifies current TOTP code", () => {
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 1, 10, 22, 0, 0);
    const code = generateTotpCode({ secret, nowMs: now });
    expect(code).not.toBeNull();
    expect(
      verifyTotpCode({
        secret,
        code: code as string,
        nowMs: now,
      })
    ).toBe(true);
  });

  it("rejects invalid TOTP code", () => {
    const secret = generateTotpSecret();
    expect(
      verifyTotpCode({
        secret,
        code: "000000",
        nowMs: Date.UTC(2026, 1, 10, 22, 0, 0),
      })
    ).toBe(false);
  });

  it("builds an otpauth URI", () => {
    const secret = generateTotpSecret();
    const uri = buildTotpUri({
      secret,
      accountName: "student@example.edu",
      issuer: "Assignment Copilot",
    });
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("secret=");
    expect(uri).toContain("issuer=");
  });
});

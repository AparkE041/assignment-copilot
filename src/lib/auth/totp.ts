import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CODE_DIGITS = 6;
const STEP_SECONDS = 30;

function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer | null {
  const normalized = normalizeBase32(input);
  if (!normalized) return null;

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) return null;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = CODE_DIGITS): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hash = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hash[hash.length - 1] & 0x0f;

  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function generateTotpSecret(length = 20): string {
  return base32Encode(randomBytes(length));
}

export function formatManualEntryKey(secret: string): string {
  return normalizeBase32(secret).replace(/(.{4})/g, "$1 ").trim();
}

export function buildTotpUri({
  secret,
  accountName,
  issuer = "Assignment Copilot",
}: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const normalizedSecret = normalizeBase32(secret);
  const safeIssuer = issuer.trim() || "Assignment Copilot";
  const safeAccount = accountName.trim() || "new-user";
  const label = encodeURIComponent(`${safeIssuer}:${safeAccount}`);

  return `otpauth://totp/${label}?secret=${encodeURIComponent(
    normalizedSecret
  )}&issuer=${encodeURIComponent(safeIssuer)}&algorithm=SHA1&digits=${CODE_DIGITS}&period=${STEP_SECONDS}`;
}

export function verifyTotpCode({
  secret,
  code,
  nowMs = Date.now(),
  window = 1,
}: {
  secret: string;
  code: string;
  nowMs?: number;
  window?: number;
}): boolean {
  const key = base32Decode(secret);
  if (!key) return false;

  const normalizedCode = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const target = Buffer.from(normalizedCode, "utf8");
  const baseCounter = Math.floor(nowMs / 1000 / STEP_SECONDS);

  for (let offset = -window; offset <= window; offset++) {
    const otp = hotp(key, baseCounter + offset);
    const candidate = Buffer.from(otp, "utf8");
    if (timingSafeEqual(candidate, target)) {
      return true;
    }
  }

  return false;
}

export function generateTotpCode({
  secret,
  nowMs = Date.now(),
}: {
  secret: string;
  nowMs?: number;
}): string | null {
  const key = base32Decode(secret);
  if (!key) return null;

  const counter = Math.floor(nowMs / 1000 / STEP_SECONDS);
  return hotp(key, counter);
}

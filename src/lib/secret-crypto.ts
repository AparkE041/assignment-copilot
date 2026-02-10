import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
let cachedKey: Buffer | null | undefined;

function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const rawHex = process.env.ENCRYPTION_KEY?.trim();
  if (!rawHex) {
    cachedKey = null;
    return cachedKey;
  }

  const normalized = rawHex.replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    cachedKey = null;
    return cachedKey;
  }

  // Derive a stable 32-byte key from provided hex so both 16-byte and 32-byte inputs work.
  cachedKey = createHash("sha256").update(Buffer.from(normalized, "hex")).digest();
  return cachedKey;
}

export function hasEncryptionKeyConfigured(): boolean {
  return !!getKey();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncryptedSecret(value)) return value;

  const key = getKey();
  if (!key) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncryptedSecret(value)) return value;

  const key = getKey();
  if (!key) return null;

  const payload = value.slice(PREFIX.length);
  const [ivB64, encryptedB64, tagB64] = payload.split(".");
  if (!ivB64 || !encryptedB64 || !tagB64) return null;

  try {
    const iv = Buffer.from(ivB64, "base64");
    const encrypted = Buffer.from(encryptedB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

import { isIP } from "net";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/secret-crypto";
import { parseIcs } from "@/lib/ics/parser";

const REQUEST_TIMEOUT_MS = 15_000;
export const AVAILABILITY_SUBSCRIPTION_SOURCE_PREFIX = "subscription:";

export interface AvailabilitySubscriptionForClient {
  id: string;
  name: string | null;
  feedUrlMasked: string;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function getSubscriptionSource(subscriptionId: string): string {
  return `${AVAILABILITY_SUBSCRIPTION_SOURCE_PREFIX}${subscriptionId}`;
}

function getSubscriptionFeedUrl(rawOrEncryptedUrl: string): string | null {
  const decrypted = decryptSecret(rawOrEncryptedUrl)?.trim() ?? null;
  if (decrypted) return decrypted;
  if (isEncryptedSecret(rawOrEncryptedUrl)) return null;
  const plaintext = rawOrEncryptedUrl.trim();
  return plaintext.length > 0 ? plaintext : null;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // fe80::/10 (partial)
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  return false;
}

function isDisallowedHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost") return true;
  if (normalized.endsWith(".localhost")) return true;
  if (normalized.endsWith(".local")) return true;

  const family = isIP(normalized);
  if (family === 4) return isPrivateIpv4(normalized);
  if (family === 6) return isPrivateIpv6(normalized);
  return false;
}

export function normalizeCalendarFeedUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Calendar feed URL is required.");
  }

  const maybeHttp = trimmed.replace(/^webcal:\/\//i, "https://");
  let parsed: URL;
  try {
    parsed = new URL(maybeHttp);
  } catch {
    throw new Error("Calendar feed URL is invalid.");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Only https:// or http:// calendar feed URLs are supported.");
  }

  if (isDisallowedHost(parsed.hostname)) {
    throw new Error("That calendar host is not allowed.");
  }

  return parsed.toString();
}

export function maskCalendarFeedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "Invalid URL";
  }
}

async function fetchIcsText(feedUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("URL did not return a valid ICS calendar.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Calendar feed request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function toAvailabilitySubscriptionForClient(subscription: {
  id: string;
  name: string | null;
  feedUrl: string;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AvailabilitySubscriptionForClient {
  const feedUrl = getSubscriptionFeedUrl(subscription.feedUrl);
  return {
    id: subscription.id,
    name: subscription.name,
    feedUrlMasked: feedUrl ? maskCalendarFeedUrl(feedUrl) : "Unavailable (encryption key mismatch)",
    lastSyncedAt: subscription.lastSyncedAt,
    lastSyncStatus: subscription.lastSyncStatus,
    lastSyncMessage: subscription.lastSyncMessage,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

export async function listAvailabilitySubscriptions(userId: string) {
  const subscriptions = await prisma.availabilitySubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return subscriptions.map(toAvailabilitySubscriptionForClient);
}

export async function createAvailabilitySubscription({
  userId,
  name,
  feedUrl,
}: {
  userId: string;
  name?: string | null;
  feedUrl: string;
}) {
  const normalizedUrl = normalizeCalendarFeedUrl(feedUrl);
  const encryptedUrl = encryptSecret(normalizedUrl) ?? normalizedUrl;

  return prisma.availabilitySubscription.create({
    data: {
      userId,
      name: name?.trim() ? name.trim() : null,
      feedUrl: encryptedUrl,
    },
  });
}

export async function syncAvailabilitySubscription(subscriptionId: string) {
  const subscription = await prisma.availabilitySubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      user: {
        select: {
          timezone: true,
        },
      },
    },
  });
  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  const rawUrl = getSubscriptionFeedUrl(subscription.feedUrl);
  if (!rawUrl) {
    throw new Error("Subscription URL is missing or unreadable.");
  }

  try {
    const icsText = await fetchIcsText(rawUrl);
    const events = parseIcs(icsText, {
      defaultTimeZone: subscription.user.timezone ?? undefined,
    }).filter(
      (event) => event.end instanceof Date && event.start instanceof Date && event.end > event.start
    );
    const source = getSubscriptionSource(subscription.id);

    const imported = await prisma.$transaction(async (tx) => {
      await tx.availabilityBlock.deleteMany({
        where: { userId: subscription.userId, source },
      });

      const created = await tx.availabilityBlock.createManyAndReturn({
        data: events.map((event) => ({
          userId: subscription.userId,
          startAt: event.start,
          endAt: event.end,
          source,
        })),
      });

      await tx.availabilitySubscription.update({
        where: { id: subscription.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "success",
          lastSyncMessage: `Imported ${created.length} block${created.length === 1 ? "" : "s"}.`,
        },
      });

      return created.length;
    });

    return {
      imported,
      source,
      subscription,
    };
  } catch (error) {
    await prisma.availabilitySubscription.update({
      where: { id: subscription.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "failed",
        lastSyncMessage: error instanceof Error ? error.message : "Sync failed.",
      },
    });
    throw error;
  }
}

export async function deleteAvailabilitySubscription(subscriptionId: string) {
  const source = getSubscriptionSource(subscriptionId);
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.availabilitySubscription.delete({
      where: { id: subscriptionId },
    });
    await tx.availabilityBlock.deleteMany({
      where: { userId: subscription.userId, source },
    });
    return subscription;
  });
}

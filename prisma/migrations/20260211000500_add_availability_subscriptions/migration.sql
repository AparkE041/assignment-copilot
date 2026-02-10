-- Persistent ICS feed subscriptions for availability syncing.
CREATE TABLE IF NOT EXISTS "AvailabilitySubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "feedUrl" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilitySubscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AvailabilitySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AvailabilitySubscription_userId_idx"
ON "AvailabilitySubscription"("userId");

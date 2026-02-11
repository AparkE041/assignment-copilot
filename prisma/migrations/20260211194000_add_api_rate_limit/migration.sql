-- Shared, database-backed rate limiting buckets.
CREATE TABLE IF NOT EXISTS "ApiRateLimit" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiRateLimit_keyHash_scope_windowStart_key"
ON "ApiRateLimit"("keyHash", "scope", "windowStart");

CREATE INDEX IF NOT EXISTS "ApiRateLimit_scope_windowStart_idx"
ON "ApiRateLimit"("scope", "windowStart");

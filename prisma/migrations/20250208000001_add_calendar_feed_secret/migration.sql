ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarFeedSecret" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_calendarFeedSecret_key" ON "User"("calendarFeedSecret") WHERE "calendarFeedSecret" IS NOT NULL;

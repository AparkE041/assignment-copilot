-- Bring production schema in sync with current Prisma models.
-- Safe for existing databases that were created from older migrations.

-- Course fields used by sync/dashboard/class pages
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "currentGrade" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "currentScore" DOUBLE PRECISION;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "syllabusExtractedText" TEXT;

-- Assignment grading fields
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "grade" TEXT;
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "score" DOUBLE PRECISION;

-- Global tutor thread tables
CREATE TABLE IF NOT EXISTS "TutorThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorThread_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TutorThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TutorMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TutorMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "TutorThread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TutorThread_userId_key" ON "TutorThread"("userId");

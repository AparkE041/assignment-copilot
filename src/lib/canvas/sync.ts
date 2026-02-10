/**
 * Canvas sync logic: fetch from API, merge with local DB, preserve local-only fields.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchCourses, fetchAssignments, fetchCourseWithSyllabus } from "./client";
import type { CanvasCourse, CanvasAssignment } from "./client";
export type { CanvasCourse, CanvasAssignment };
import {
  extractSyllabusFromLinkedFiles,
  extractSyllabusFromCourseFiles,
} from "@/lib/syllabus/extract-from-file";
import { encryptSecret } from "@/lib/secret-crypto";

const CANVAS_BASE =
  process.env.CANVAS_BASE_URL ?? "https://belmont.instructure.com";

export interface SyncResult {
  success: boolean;
  coursesCreated: number;
  coursesUpdated: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  error?: string;
}

export async function syncCanvas(
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    coursesCreated: 0,
    coursesUpdated: 0,
    assignmentsCreated: 0,
    assignmentsUpdated: 0,
  };

  try {
    const token = accessToken.trim();
    if (token) {
      const encryptedToken = encryptSecret(token) ?? token;
      // Upsert Canvas connection
      await prisma.canvasConnection.upsert({
        where: { userId },
        create: { userId, accessToken: encryptedToken },
        update: { accessToken: encryptedToken },
      });
    }

    const courses = await fetchCourses(token || null);

    for (const c of courses) {
      const existing = await prisma.course.findUnique({
        where: { userId_canvasId: { userId, canvasId: String(c.id) } },
      });

      // Fetch full course with syllabus when using real Canvas (not mock)
      let payload: object = c as object;
      let syllabusExtractedText: string | null = null;
      const withSyllabus = await fetchCourseWithSyllabus(c.id, token || null);
      if (withSyllabus && typeof (withSyllabus as Record<string, unknown>).syllabus_body !== "undefined") {
        payload = withSyllabus as object;
        const syllabusBody = (withSyllabus as Record<string, unknown>).syllabus_body;
        try {
          if (typeof syllabusBody === "string" && syllabusBody.trim()) {
            syllabusExtractedText =
              (await extractSyllabusFromLinkedFiles(
                syllabusBody,
                CANVAS_BASE,
                token,
                String(c.id)
              )) ?? null;
          }
          if (!syllabusExtractedText) {
            syllabusExtractedText =
              (await extractSyllabusFromCourseFiles(
                String(c.id),
                CANVAS_BASE,
                token
              )) ?? null;
          }
        } catch {
          // Ignore extraction errors
        }
      }

      // Extract grade from enrollments (Canvas includes with total_scores)
      const enrollments = (c as Record<string, unknown>).enrollments as
        | Array<{ type?: string; current_grade?: string | null; current_score?: number | null }>
        | undefined;
      const studentEnrollment = enrollments?.find((e) => e.type === "student");

      const courseData = {
        canvasId: String(c.id),
        userId,
        name: c.name,
        currentGrade: studentEnrollment?.current_grade ?? null,
        currentScore: studentEnrollment?.current_score ?? null,
        rawPayload: payload,
        ...(syllabusExtractedText != null && { syllabusExtractedText }),
      };

      if (existing) {
        await prisma.course.update({
          where: { id: existing.id },
          data: courseData,
        });
        result.coursesUpdated++;
      } else {
        await prisma.course.create({ data: courseData });
        result.coursesCreated++;
      }

      // Fetch assignments for this course
      const assignments = await fetchAssignments(c.id, token || null);
      const course = await prisma.course.findUnique({
        where: { userId_canvasId: { userId, canvasId: String(c.id) } },
      });
      if (!course) continue;

      for (const a of assignments) {
        const existingAssign = await prisma.assignment.findUnique({
          where: {
            courseId_canvasId: { courseId: course.id, canvasId: String(a.id) },
          },
          include: { localState: true },
        });

        // Extract grade data from submission (Canvas includes it with include[]=submission)
        const submission = (a as Record<string, unknown>).submission as
          | { score?: number | null; grade?: string | null }
          | undefined;

        const assignData = {
          courseId: course.id,
          canvasId: String(a.id),
          title: a.name,
          descriptionHtml: a.description ?? null,
          dueAt: a.due_at ? new Date(a.due_at) : null,
          points: a.points_possible ?? null,
          grade: submission?.grade ?? null,
          score: submission?.score ?? null,
          submissionTypes: (a.submission_types ?? []) as Prisma.InputJsonValue,
          rubric: a.rubric != null ? (a.rubric as Prisma.InputJsonValue) : Prisma.JsonNull,
          rawPayload: a as Prisma.InputJsonValue,
        };

        if (existingAssign) {
          await prisma.assignment.update({
            where: { id: existingAssign.id },
            data: assignData,
          });
          result.assignmentsUpdated++;

          // Preserve local state - ensure it exists
          if (!existingAssign.localState) {
            await prisma.assignmentLocalState.create({
              data: {
                assignmentId: existingAssign.id,
                status: "not_started",
                estimatedEffortMinutes: 60,
              },
            });
          }
        } else {
          const created = await prisma.assignment.create({
            data: assignData,
          });
          result.assignmentsCreated++;
          // Create default local state
          await prisma.assignmentLocalState.create({
            data: {
              assignmentId: created.id,
              status: "not_started",
              estimatedEffortMinutes: 60,
            },
          });
        }
      }
    }

    // Log sync
    await prisma.syncLog.create({
      data: {
        userId,
        type: "canvas_full",
        status: "success",
        message: JSON.stringify(result),
      },
    });
  } catch (err) {
    result.success = false;
    result.error = err instanceof Error ? err.message : "Unknown error";
    await prisma.syncLog.create({
      data: {
        userId,
        type: "canvas_full",
        status: "failed",
        message: result.error,
      },
    });
  }

  return result;
}

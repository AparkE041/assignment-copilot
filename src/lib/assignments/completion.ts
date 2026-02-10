export interface GradeCompletionInput {
  score?: number | null;
  grade?: string | null;
  points?: number | null;
}

function parseNumericGrade(grade: string | null | undefined): number | null {
  if (typeof grade !== "string") return null;
  const trimmed = grade.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/%$/, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isGraded(input: GradeCompletionInput): boolean {
  const hasScore = typeof input.score === "number";
  const hasGradeText = typeof input.grade === "string" && input.grade.trim().length > 0;
  return hasScore || hasGradeText;
}

export function isZeroScoreWithPositivePoints(
  input: GradeCompletionInput
): boolean {
  const points = typeof input.points === "number" ? input.points : null;
  if (points == null || points <= 0) return false;

  if (typeof input.score === "number" && input.score === 0) return true;

  const numericGrade = parseNumericGrade(input.grade);
  return numericGrade === 0;
}

/**
 * Canvas graded work is auto-completed unless score is exactly 0 while points > 0.
 */
export function shouldAutoCompleteFromGrade(
  input: GradeCompletionInput
): boolean {
  if (!isGraded(input)) return false;
  return !isZeroScoreWithPositivePoints(input);
}

export function getEffectiveAssignmentStatus({
  localStatus,
  score,
  grade,
  points,
}: GradeCompletionInput & { localStatus?: string | null }): string {
  if (shouldAutoCompleteFromGrade({ score, grade, points })) {
    return "done";
  }
  return localStatus ?? "not_started";
}

/**
 * Canvas API client.
 * When CANVAS_PAT is unset, returns mock data for dev mode.
 */

const CANVAS_BASE_URL =
  process.env.CANVAS_BASE_URL ?? "https://canvas.instructure.com";

const MAX_PAGINATION_PAGES = 50;
const DEFAULT_PER_PAGE = 100;

export interface CanvasCourse {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at: string | null;
  points_possible: number | null;
  submission_types?: string[];
  rubric?: unknown[];
  [key: string]: unknown;
}

export interface CanvasSubmissionType {
  type: string;
  [key: string]: unknown;
}

function getAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Canvas paginates responses and exposes next links in the Link header.
 * Example:
 * <https://.../api/v1/courses?page=2&per_page=100>; rel="next"
 */
function getNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const [rawUrl, rawRel] = part.split(";");
    if (!rawUrl || !rawRel) continue;
    if (!rawRel.includes('rel="next"')) continue;
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) continue;
    return trimmed.slice(1, -1);
  }
  return null;
}

async function fetchCanvasPaginated<T>(
  initialUrl: string,
  token: string
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = initialUrl;
  let pages = 0;

  while (nextUrl) {
    pages++;
    if (pages > MAX_PAGINATION_PAGES) {
      throw new Error(
        `Canvas pagination exceeded ${MAX_PAGINATION_PAGES} pages. Check API token/scope.`
      );
    }

    const res = await fetch(nextUrl, { headers: getAuthHeaders(token) });
    if (!res.ok) {
      throw new Error(`Canvas API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Canvas API returned non-array paginated payload.");
    }
    items.push(...(data as T[]));

    nextUrl = getNextLink(res.headers.get("link"));
  }

  return items;
}

function shouldAllowMockCanvas(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.CANVAS_ALLOW_MOCK === "true"
  );
}

/**
 * Fetch courses from Canvas API or return mock data.
 */
export async function fetchCourses(accessToken?: string | null): Promise<CanvasCourse[]> {
  const token = accessToken || process.env.CANVAS_PAT;
  if (!token) {
    if (!shouldAllowMockCanvas()) {
      throw new Error(
        "Canvas token is required. Configure Canvas in Settings or set CANVAS_PAT."
      );
    }
    return getMockCourses();
  }
  const url =
    `${CANVAS_BASE_URL}/api/v1/courses` +
    `?enrollment_state=active` +
    `&include[]=total_scores` +
    `&per_page=${DEFAULT_PER_PAGE}`;

  return fetchCanvasPaginated<CanvasCourse>(url, token);
}

/**
 * Fetch assignments for a course from Canvas API or return mock data.
 */
export async function fetchAssignments(
  courseId: string | number,
  accessToken?: string | null
): Promise<CanvasAssignment[]> {
  const token = accessToken || process.env.CANVAS_PAT;
  if (!token) {
    if (!shouldAllowMockCanvas()) {
      throw new Error(
        "Canvas token is required. Configure Canvas in Settings or set CANVAS_PAT."
      );
    }
    return getMockAssignments(String(courseId));
  }
  const url =
    `${CANVAS_BASE_URL}/api/v1/courses/${courseId}/assignments` +
    `?include[]=submission` +
    `&per_page=${DEFAULT_PER_PAGE}`;

  return fetchCanvasPaginated<CanvasAssignment>(url, token);
}

/**
 * Fetch a single course with syllabus_body from Canvas API.
 * Returns null if not found or in mock mode.
 */
export async function fetchCourseWithSyllabus(
  courseId: string | number,
  accessToken?: string | null
): Promise<CanvasCourse | null> {
  const token = accessToken || process.env.CANVAS_PAT;
  if (!token) {
    if (shouldAllowMockCanvas()) return null;
    throw new Error(
      "Canvas token is required. Configure Canvas in Settings or set CANVAS_PAT."
    );
  }

  const res = await fetch(
    `${CANVAS_BASE_URL}/api/v1/courses/${courseId}?include[]=syllabus_body`,
    { headers: getAuthHeaders(token) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data && typeof data.id !== "undefined" ? data : null;
}

/**
 * Mock courses for dev mode when CANVAS_PAT is unset.
 */
function getMockCourses(): CanvasCourse[] {
  return [
    {
      id: 1001,
      name: "Introduction to Computer Science",
      _mock: true,
      syllabus_body: null,
    },
    { id: 1002, name: "Data Structures", _mock: true, syllabus_body: null },
    { id: 1003, name: "Web Development", _mock: true, syllabus_body: null },
  ];
}

/**
 * Mock assignments for dev mode when CANVAS_PAT is unset.
 */
function getMockAssignments(courseId: string): CanvasAssignment[] {
  const now = new Date();
  const baseDue = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const byCourse: Record<string, CanvasAssignment[]> = {
    "1001": [
      {
        id: 101,
        name: "Programming Assignment 1: Hello World",
        description: "<p>Write a program that prints 'Hello, World!'</p>",
        due_at: new Date(baseDue).toISOString(),
        points_possible: 10,
        submission_types: ["online_upload"],
      },
    ],
    "1002": [
      {
        id: 102,
        name: "Linked List Implementation",
        description: "<p>Implement a doubly-linked list.</p>",
        due_at: new Date(baseDue.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 50,
        submission_types: ["online_upload"],
      },
    ],
    "1003": [
      {
        id: 103,
        name: "React Component Project",
        description: "<p>Build a todo list component.</p>",
        due_at: new Date(baseDue.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 100,
        submission_types: ["online_url"],
      },
    ],
  };

  return byCourse[courseId] ?? [];
}

/**
 * Check if we're in mock mode (no PAT).
 */
export function isMockMode(): boolean {
  return shouldAllowMockCanvas() && !process.env.CANVAS_PAT;
}

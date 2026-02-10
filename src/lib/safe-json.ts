/**
 * Safely parse JSON from a Response. Handles empty body (avoids "Unexpected end of JSON input").
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text?.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Build rich context for assignment chat by including description + attachment text.
 * Uses keyword matching to find the most relevant chunks when text is too long.
 */

const MAX_CONTEXT_CHARS = 8000;
const CHUNK_SIZE = 800;

/**
 * Score a chunk against the user's message using simple keyword overlap.
 */
function relevanceScore(chunk: string, query: string): number {
  const queryWords = new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2),
  );
  const chunkLower = chunk.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (chunkLower.includes(word)) score++;
  }
  return score;
}

/**
 * Split text into chunks that fit within the context window.
 */
function chunkText(text: string, size: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > size && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Build the best context string for a chat message, given assignment content.
 * If total text fits within limit, returns everything.
 * Otherwise, scores chunks against the user query and picks the top ones.
 */
export function buildRichContext(
  descriptionText: string,
  attachmentTexts: string[],
  userMessage: string,
): string {
  const allText = [descriptionText, ...attachmentTexts].filter(Boolean).join("\n\n---\n\n");

  // If everything fits, just return it all
  if (allText.length <= MAX_CONTEXT_CHARS) {
    return allText;
  }

  // Chunk all text
  const chunks = chunkText(allText);

  // Score each chunk
  const scored = chunks.map((chunk) => ({
    chunk,
    score: relevanceScore(chunk, userMessage),
  }));

  // Always include the first chunk (usually assignment overview)
  const selected: string[] = [chunks[0]];
  let totalLen = chunks[0].length;

  // Sort remaining by relevance, add until we hit limit
  const rest = scored
    .slice(1)
    .sort((a, b) => b.score - a.score);

  for (const item of rest) {
    if (totalLen + item.chunk.length + 10 > MAX_CONTEXT_CHARS) continue;
    selected.push(item.chunk);
    totalLen += item.chunk.length + 10;
  }

  return selected.join("\n\n---\n\n");
}

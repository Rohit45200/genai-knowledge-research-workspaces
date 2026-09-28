export interface ChunkingOptions {
  chunkSize?: number;       // Target characters per chunk (default: 500)
  chunkOverlap?: number;    // Overlap characters between chunks (default: 100)
  separators?: string[];    // Recursive split hierarchy
}

export interface RawChunk {
  index: number;
  text: string;
  characterCount: number;
  estimatedTokens: number;
}

/**
 * Production Recursive Character Text Chunker
 * Recursively splits on natural boundaries:
 * 1. Double newlines (paragraphs)
 * 2. Single newlines (lines)
 * 3. Sentence boundaries (.!?)
 * 4. Word spaces (' ')
 * 5. Character fallbacks
 */
export function recursiveChunkText(
  text: string,
  options: ChunkingOptions = {}
): RawChunk[] {
  const {
    chunkSize = 500,
    chunkOverlap = 100,
    separators = ['\n\n', '\n', '. ', '? ', '! ', '; ', ' ', '']
  } = options;

  if (!text || text.trim().length === 0) return [];

  // Helper to recursively break text
  function splitText(content: string, separatorIndex: number): string[] {
    if (content.length <= chunkSize) {
      return [content.trim()];
    }

    if (separatorIndex >= separators.length) {
      // Hard break if all separators exhausted
      const hardChunks: string[] = [];
      let i = 0;
      while (i < content.length) {
        hardChunks.push(content.slice(i, i + chunkSize));
        i += chunkSize - chunkOverlap;
      }
      return hardChunks;
    }

    const separator = separators[separatorIndex];
    const splits = separator === '' 
      ? content.split('') 
      : content.split(separator);

    const result: string[] = [];
    let currentPiece = '';

    for (let i = 0; i < splits.length; i++) {
      const part = splits[i];
      const candidate = currentPiece 
        ? currentPiece + (separator || '') + part 
        : part;

      if (candidate.length <= chunkSize) {
        currentPiece = candidate;
      } else {
        if (currentPiece) {
          result.push(currentPiece.trim());
          // Retain overlap from end of currentPiece
          const overlapStart = Math.max(0, currentPiece.length - chunkOverlap);
          currentPiece = currentPiece.slice(overlapStart) + (separator || '') + part;
        } else {
          // Part itself is larger than chunkSize -> recurse with next separator
          const subSplits = splitText(part, separatorIndex + 1);
          result.push(...subSplits);
          currentPiece = '';
        }
      }
    }

    if (currentPiece.trim()) {
      result.push(currentPiece.trim());
    }

    return result.filter(c => c.length > 0);
  }

  const rawPieces = splitText(text, 0);

  return rawPieces.map((piece, idx) => ({
    index: idx + 1,
    text: piece,
    characterCount: piece.length,
    estimatedTokens: Math.ceil(piece.length / 4)
  }));
}

import { DocumentChunk } from '../../src/types/document';
import { RetrievedChunk } from '../../src/types/rag';
import { calculateCosineSimilarity, generateEmbedding } from '../core/embeddings';

export interface VectorRecord {
  id: string;
  documentId: string;
  documentName: string;
  chunk: DocumentChunk;
  vector: number[];
}

export interface VectorSearchParams {
  queryVector?: number[];
  queryText?: string;
  topK?: number;
  minSimilarity?: number;
  documentIds?: string[];
}

/**
 * High-Performance In-Memory Cosine Vector Database
 * Provides:
 * - O(N) Cosine Vector Similarity search with metadata isolation
 * - Document-scoped partition filtering
 * - Dynamic insertion, batch indexing, and document-level deletions
 */
export class VectorStore {
  private records: Map<string, VectorRecord> = new Map();

  /**
   * Adds or updates a single chunk vector in the store.
   */
  public insert(chunk: DocumentChunk, vector: number[]): void {
    this.records.set(chunk.id, {
      id: chunk.id,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunk,
      vector
    });
  }

  /**
   * Batch inserts multiple chunks with corresponding embedding vectors.
   */
  public insertBatch(chunks: DocumentChunk[], vectors: number[][]): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = vectors[i] || [];
      if (vector.length > 0) {
        this.insert(chunk, vector);
      }
    }
  }

  /**
   * Deletes all vector embeddings associated with a given documentId.
   */
  public deleteByDocumentId(documentId: string): number {
    let deletedCount = 0;
    for (const [id, record] of this.records.entries()) {
      if (record.documentId === documentId) {
        this.records.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Searches the vector space for top-K nearest neighbors using cosine similarity.
   */
  public async search(params: VectorSearchParams): Promise<RetrievedChunk[]> {
    const {
      queryVector: providedVector,
      queryText,
      topK = 5,
      minSimilarity = 0.3,
      documentIds
    } = params;

    // Resolve query embedding vector
    let queryVector = providedVector;
    if (!queryVector && queryText) {
      queryVector = await generateEmbedding(queryText);
    }

    if (!queryVector || queryVector.length === 0) {
      return [];
    }

    const matches: RetrievedChunk[] = [];

    for (const record of this.records.values()) {
      // 1. Metadata Pre-filtering (filter by active document scope if specified)
      if (documentIds && documentIds.length > 0 && !documentIds.includes(record.documentId)) {
        continue;
      }

      // 2. Cosine Similarity Calculation
      const similarityScore = calculateCosineSimilarity(queryVector, record.vector);

      // 3. Minimum threshold filtering
      if (similarityScore >= minSimilarity) {
        matches.push({
          chunk: record.chunk,
          similarityScore: parseFloat(similarityScore.toFixed(4)),
          rank: 0
        });
      }
    }

    // 4. Sort descending by similarity score and truncate to topK
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    const topMatches = matches.slice(0, topK);
    return topMatches.map((m, idx) => ({ ...m, rank: idx + 1 }));
  }

  /**
   * Returns total count of indexed vector embeddings.
   */
  public count(): number {
    return this.records.size;
  }

  /**
   * Clears the entire vector store.
   */
  public clear(): void {
    this.records.clear();
  }
}

export const vectorStore = new VectorStore();

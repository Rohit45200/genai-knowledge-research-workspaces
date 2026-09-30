import { vectorStore } from '../db/vectorStore';
import { RetrievedChunk } from '../../src/types/rag';

export interface RetrievalOptions {
  query: string;
  topK?: number;
  minSimilarity?: number;
  documentIds?: string[];
  semanticWeight?: number; // 0.0 to 1.0 (default: 0.7 semantic, 0.3 keyword)
}

/**
 * Hybrid Semantic + Keyword Retriever
 * Combines dense vector cosine similarity with BM25-style lexical keyword matching.
 * This prevents pure vector "blind spots" on exact serial numbers, acronyms, or rare terms.
 */
export async function retrieveHybridChunks(options: RetrievalOptions): Promise<RetrievedChunk[]> {
  const {
    query,
    topK = 4,
    minSimilarity = 0.25,
    documentIds,
    semanticWeight = 0.75
  } = options;

  // 1. Dense Semantic Vector Search
  const vectorResults = await vectorStore.search({
    queryText: query,
    topK: topK * 2, // Fetch a broader candidate pool for reranking
    minSimilarity: 0.05, // Allow candidate generation across dense space
    documentIds
  });

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  // 2. Score Fusion (Dense Vector Cosine + Lexical Keyword Frequency)
  const fusedScores = vectorResults.map((item) => {
    const chunkContent = item.chunk.content.toLowerCase();
    
    // Lexical match density
    let termMatches = 0;
    queryTerms.forEach(term => {
      if (chunkContent.includes(term)) {
        termMatches++;
      }
    });

    const lexicalScore = queryTerms.length > 0 
      ? termMatches / queryTerms.length 
      : 0.5;

    // Weighted hybrid score
    const combinedScore = (item.similarityScore * semanticWeight) + (lexicalScore * (1 - semanticWeight));

    return {
      chunk: item.chunk,
      similarityScore: parseFloat(combinedScore.toFixed(4)),
      rank: 0
    };
  });

  // 3. Filter by minimum combined threshold and sort
  // If threshold is strict, ensure top candidate is preserved if score > 0.12
  let filtered = fusedScores
    .filter(r => r.similarityScore >= minSimilarity)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topK);

  if (filtered.length === 0 && fusedScores.length > 0) {
    const highest = [...fusedScores].sort((a, b) => b.similarityScore - a.similarityScore)[0];
    if (highest && highest.similarityScore >= 0.12) {
      filtered = [highest];
    }
  }

  return filtered.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}

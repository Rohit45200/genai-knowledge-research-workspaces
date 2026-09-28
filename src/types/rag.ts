/**
 * Retrieval-Augmented Generation (RAG) Models
 */

import { DocumentChunk } from './document';

export interface RetrievedChunk {
  chunk: DocumentChunk;
  similarityScore: number; // 0.0 to 1.0 (cosine similarity)
  rank: number;
}

export interface Citation {
  id: string;
  sourceNumber: number;
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  similarityScore: number;
}

export interface RAGQueryRequest {
  query: string;
  selectedDocumentIds?: string[];
  topK?: number;
  minSimilarity?: number;
  stream?: boolean;
}

export interface RAGQueryResponse {
  answer: string;
  citations: Citation[];
  retrievedChunks: RetrievedChunk[];
  latencyMs: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  groundednessScore?: number;
}

export interface StreamEvent {
  type: 'token' | 'thought' | 'tool_call' | 'tool_result' | 'citation' | 'done' | 'error';
  content?: string;
  data?: unknown;
}

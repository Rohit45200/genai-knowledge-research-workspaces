/**
 * Document & Chunk Models
 */

export interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  chunkCount: number;
  characterCount: number;
  wordCount: number;
  tags?: string[];
  summary?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  tokenCountEstimate: number;
  characterCount: number;
  embedding?: number[];
  metadata?: {
    pageNumber?: number;
    sectionHeading?: string;
  };
}

export interface IngestionStatus {
  documentId: string;
  documentName: string;
  status: 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'indexed' | 'failed';
  progress: number; // 0 - 100
  error?: string;
}

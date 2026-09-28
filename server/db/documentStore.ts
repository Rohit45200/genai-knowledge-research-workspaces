import { DocumentMetadata, DocumentChunk } from '../../src/types/document';
import { vectorStore } from './vectorStore';
import { generateEmbedding } from '../core/embeddings';

/**
 * In-Memory Document and Chunk Metadata Store
 * Synchronized with the VectorStore engine.
 */
class DocumentStore {
  private documents: Map<string, DocumentMetadata> = new Map();
  private chunks: Map<string, DocumentChunk[]> = new Map();

  constructor() {
    this.seedInitialDocuments();
  }

  private async seedInitialDocuments() {
    const doc1: DocumentMetadata = {
      id: 'doc-rag-arch-1',
      name: 'rag_architecture_spec.md',
      size: 14200,
      type: 'text/markdown',
      uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      chunkCount: 2,
      characterCount: 4200,
      wordCount: 680,
      summary: 'Specification of recursive character chunking with overlap and cosine vector retrieval.'
    };

    const doc2: DocumentMetadata = {
      id: 'doc-agent-patterns-2',
      name: 'agentic_tool_orchestration.pdf',
      size: 28400,
      type: 'application/pdf',
      uploadedAt: new Date(Date.now() - 1800000).toISOString(),
      chunkCount: 1,
      characterCount: 8900,
      wordCount: 1450,
      summary: 'Stateful agent reasoning with Thought-Action-Observation loop and autonomous tools.'
    };

    this.documents.set(doc1.id, doc1);
    this.documents.set(doc2.id, doc2);

    const chunk1: DocumentChunk = {
      id: 'chunk-1',
      documentId: 'doc-rag-arch-1',
      documentName: 'rag_architecture_spec.md',
      chunkIndex: 1,
      content: 'Retrieval-Augmented Generation (RAG) grounds language models on private corporate knowledge. By chunking text recursively with overlap (typically 500 characters with 100 character overlap), boundary contexts are preserved across vector queries.',
      tokenCountEstimate: 52,
      characterCount: 245
    };

    const chunk2: DocumentChunk = {
      id: 'chunk-2',
      documentId: 'doc-rag-arch-1',
      documentName: 'rag_architecture_spec.md',
      chunkIndex: 2,
      content: 'Vector embeddings are generated using gemini-embedding-2-preview producing 768-dimensional normalized unit vectors. Cosine similarity calculates dot products between query vectors and indexed document vectors to return top-k nearest neighbors.',
      tokenCountEstimate: 48,
      characterCount: 236
    };

    const chunk3: DocumentChunk = {
      id: 'chunk-3',
      documentId: 'doc-agent-patterns-2',
      documentName: 'agentic_tool_orchestration.pdf',
      chunkIndex: 1,
      content: 'The agent loop follows a Thought-Action-Observation cycle. Rather than generating a single-shot response, the planner selects registered tools such as semantic_search or calculator to gather factual data before final synthesis.',
      tokenCountEstimate: 46,
      characterCount: 228
    };

    this.chunks.set(doc1.id, [chunk1, chunk2]);
    this.chunks.set(doc2.id, [chunk3]);

    // Index seed embeddings into VectorStore
    const vec1 = await generateEmbedding(chunk1.content);
    const vec2 = await generateEmbedding(chunk2.content);
    const vec3 = await generateEmbedding(chunk3.content);

    chunk1.embedding = vec1;
    chunk2.embedding = vec2;
    chunk3.embedding = vec3;

    vectorStore.insert(chunk1, vec1);
    vectorStore.insert(chunk2, vec2);
    vectorStore.insert(chunk3, vec3);
  }

  public getAllDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  public getDocument(id: string): DocumentMetadata | undefined {
    return this.documents.get(id);
  }

  public addDocument(doc: DocumentMetadata, docChunks: DocumentChunk[]): void {
    this.documents.set(doc.id, doc);
    this.chunks.set(doc.id, docChunks);

    // Index chunks into vector store
    for (const chunk of docChunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorStore.insert(chunk, chunk.embedding);
      }
    }
  }

  public deleteDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    this.chunks.delete(id);
    vectorStore.deleteByDocumentId(id);
    return deleted;
  }

  public getChunksForDocument(docId: string): DocumentChunk[] {
    return this.chunks.get(docId) || [];
  }

  public getAllChunks(docIdsFilter?: string[]): DocumentChunk[] {
    const result: DocumentChunk[] = [];
    for (const [docId, docChunks] of this.chunks.entries()) {
      if (!docIdsFilter || docIdsFilter.length === 0 || docIdsFilter.includes(docId)) {
        result.push(...docChunks);
      }
    }
    return result;
  }
}

export const documentStore = new DocumentStore();

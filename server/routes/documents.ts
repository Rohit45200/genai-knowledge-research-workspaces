import { Router, Request, Response } from 'express';
import { documentStore } from '../db/documentStore';
import { parseDocument } from '../documents/parser';
import { recursiveChunkText } from '../documents/chunker';
import { generateBatchEmbeddings } from '../core/embeddings';
import { metricsTracker } from '../monitoring/metricsTracker';
import { DocumentMetadata, DocumentChunk } from '../../src/types/document';

const router = Router();

// GET /api/documents - List all ingested documents
router.get('/', (req: Request, res: Response) => {
  const docs = documentStore.getAllDocuments();
  res.json({
    success: true,
    count: docs.length,
    documents: docs
  });
});

// GET /api/documents/:id - Get specific document and its chunks
router.get('/:id', (req: Request, res: Response) => {
  const doc = documentStore.getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }
  const chunks = documentStore.getChunksForDocument(req.params.id);
  res.json({
    success: true,
    document: doc,
    chunks
  });
});

// POST /api/documents - Full Ingestion Pipeline (Parse -> Clean -> Recursive Chunk -> Embed)
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { name, content, type } = req.body;

  if (!name || typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'File name and text content are required' });
  }

  // 1. Universal Parsing & Cleaning
  const parsed = await parseDocument(name, content, type);

  if (!parsed.cleanedText || parsed.cleanedText.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Document contains no extractable text' });
  }

  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 2. Production Recursive Character Chunking (500 chars with 100 char overlap)
  const rawChunks = recursiveChunkText(parsed.cleanedText, {
    chunkSize: 500,
    chunkOverlap: 100
  });

  // 3. Batch Generate 768-dim Vector Embeddings
  const chunkTexts = rawChunks.map(c => c.text);
  const embeddings = await generateBatchEmbeddings(chunkTexts);

  // 4. Assemble Document Chunks with Vectors and Metadata
  const chunks: DocumentChunk[] = rawChunks.map((rc, idx) => ({
    id: `chunk-${docId}-${rc.index}`,
    documentId: docId,
    documentName: parsed.name,
    chunkIndex: rc.index,
    content: rc.text,
    characterCount: rc.characterCount,
    tokenCountEstimate: rc.estimatedTokens,
    embedding: embeddings[idx]
  }));

  const newDoc: DocumentMetadata = {
    id: docId,
    name: parsed.name,
    size: Buffer.byteLength(content, 'utf8'),
    type: parsed.type,
    uploadedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    characterCount: parsed.characterCount,
    wordCount: parsed.wordCount,
    summary: parsed.cleanedText.slice(0, 160) + (parsed.cleanedText.length > 160 ? '...' : '')
  };

  documentStore.addDocument(newDoc, chunks);

  const allDocs = documentStore.getAllDocuments();
  const allChunks = documentStore.getAllChunks();
  metricsTracker.updateDocStats(allDocs.length, allChunks.length);

  const durationMs = Date.now() - startTime;
  metricsTracker.recordRequest({
    type: 'search',
    durationMs,
    status: 'success',
    tokenCount: parsed.metadata.estimatedTokens
  });

  res.status(201).json({
    success: true,
    document: newDoc,
    chunksCount: chunks.length,
    stats: {
      rawLength: parsed.rawText.length,
      cleanedLength: parsed.cleanedText.length,
      wordCount: parsed.wordCount,
      estimatedTokens: parsed.metadata.estimatedTokens,
      chunksGenerated: chunks.length,
      embeddingsGenerated: embeddings.length,
      processingTimeMs: durationMs
    }
  });
});

// DELETE /api/documents/:id - Delete document and associated chunks
router.delete('/:id', (req: Request, res: Response) => {
  const docId = req.params.id;
  const deleted = documentStore.deleteDocument(docId);

  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  const allDocs = documentStore.getAllDocuments();
  const allChunks = documentStore.getAllChunks();
  metricsTracker.updateDocStats(allDocs.length, allChunks.length);

  res.json({
    success: true,
    message: `Document ${docId} deleted successfully`
  });
});

export default router;

import { Router, Request, Response } from 'express';
import { documentStore } from '../db/documentStore';
import { generateGroundedResponse } from '../core/llmService';
import { Citation, RetrievedChunk } from '../../src/types/rag';

const router = Router();

// POST /api/llm/generate - Generate grounded completion via Gemini
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { query, documentIds, topK = 4 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // Retrieve relevant chunks from document store
    const chunks = documentStore.getAllChunks(documentIds);
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // Lexical match ranking for retrieval context
    const scored = chunks.map((chunk) => {
      const text = chunk.content.toLowerCase();
      let matches = 0;
      queryTerms.forEach(term => {
        if (text.includes(term)) matches++;
      });
      const score = queryTerms.length > 0 ? Math.min(0.98, (matches / queryTerms.length) * 0.8 + 0.18) : 0.25;
      return { chunk, score };
    }).sort((a, b) => b.score - a.score).slice(0, topK);

    const contextChunks = scored.map(s => s.chunk);

    // Call Gemini 3.8 Flash with grounded prompt
    const result = await generateGroundedResponse({
      query,
      contextChunks,
      temperature: 0.2
    });

    const citations: Citation[] = contextChunks.map((chunk, idx) => ({
      id: `cite-${Date.now()}-${idx + 1}`,
      sourceNumber: idx + 1,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex,
      snippet: chunk.content,
      similarityScore: scored[idx]?.score || 0.85
    }));

    res.json({
      success: true,
      answer: result.text,
      citations,
      latencyMs: result.latencyMs,
      tokensUsed: result.tokensUsed
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown generation error';
    res.status(500).json({
      success: false,
      error: 'LLM Generation Failed',
      message
    });
  }
});

export default router;

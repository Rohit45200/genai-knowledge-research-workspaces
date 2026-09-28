import { Router, Request, Response } from 'express';
import { executeRAGPipeline } from '../rag/pipeline';
import { streamGroundedRAG } from '../rag/streamService';

const router = Router();

// POST /api/rag/query - Complete Grounded RAG Query Pipeline (JSON or Streaming SSE)
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      documentIds, 
      topK = 4, 
      minSimilarity = 0.25, 
      temperature = 0.2, 
      stream = false 
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query string is required' });
    }

    const docIds = Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : undefined;

    // Check if client requested Server-Sent Events streaming
    if (stream) {
      return await streamGroundedRAG(
        {
          query,
          documentIds: docIds,
          topK: Number(topK),
          minSimilarity: Number(minSimilarity),
          temperature: Number(temperature)
        },
        res
      );
    }

    // Standard synchronous JSON response
    const response = await executeRAGPipeline({
      query,
      documentIds: docIds,
      topK: Number(topK),
      minSimilarity: Number(minSimilarity),
      temperature: Number(temperature)
    });

    res.json({
      success: true,
      ...response
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'RAG Pipeline execution failed';
    res.status(500).json({
      success: false,
      error: 'RAG Execution Failed',
      message: msg
    });
  }
});

export default router;

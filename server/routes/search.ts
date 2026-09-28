import { Router, Request, Response } from 'express';
import { vectorStore } from '../db/vectorStore';
import { metricsTracker } from '../monitoring/metricsTracker';

const router = Router();

// POST /api/search - Dense Semantic Vector Search via Cosine Similarity
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { query, topK = 5, minSimilarity = 0.3, documentIds } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, error: 'Query string is required' });
  }

  try {
    // Execute cosine similarity search across vector records
    const results = await vectorStore.search({
      queryText: query,
      topK: Number(topK),
      minSimilarity: Number(minSimilarity),
      documentIds: Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : undefined
    });

    const durationMs = Date.now() - startTime;

    metricsTracker.recordRequest({
      type: 'search',
      durationMs,
      status: 'success',
      documentCount: documentIds ? documentIds.length : undefined
    });

    res.json({
      success: true,
      query,
      count: results.length,
      results,
      durationMs,
      totalIndexedVectors: vectorStore.count()
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : 'Vector search failed';
    metricsTracker.recordRequest({
      type: 'search',
      durationMs,
      status: 'error',
      error: msg
    });

    res.status(500).json({
      success: false,
      error: 'Semantic Search Failed',
      message: msg
    });
  }
});

export default router;

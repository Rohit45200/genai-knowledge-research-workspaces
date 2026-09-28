import { Router, Request, Response } from 'express';
import { evaluateRAGQuality } from '../evaluation/evaluator';

const router = Router();

// POST /api/evaluation/run - Run complete Ragas-style evaluation on a query
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { query, expectedGroundTruth, documentIds } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query string is required for evaluation' });
    }

    const evalResult = await evaluateRAGQuality({
      query,
      expectedGroundTruth,
      documentIds: Array.isArray(documentIds) && documentIds.length > 0 ? documentIds : undefined
    });

    res.json({
      success: true,
      evaluation: evalResult
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Evaluation run failed';
    res.status(500).json({
      success: false,
      error: 'Evaluation Execution Failed',
      message: msg
    });
  }
});

export default router;

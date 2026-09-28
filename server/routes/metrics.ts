import { Router, Request, Response } from 'express';
import { metricsTracker } from '../monitoring/metricsTracker';

const router = Router();

// GET /api/metrics - Get aggregated LLMOps telemetry
router.get('/', (req: Request, res: Response) => {
  const metrics = metricsTracker.getMetrics();
  const logs = metricsTracker.getLogs();
  res.json({
    success: true,
    metrics,
    logs
  });
});

export default router;

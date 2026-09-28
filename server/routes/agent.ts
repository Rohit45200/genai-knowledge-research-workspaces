import { Router, Request, Response } from 'express';
import { runAgentReActLoop } from '../agent/agentRunner';
import { AGENT_TOOLS } from '../agent/tools';

const router = Router();

// GET /api/agent/tools - Get list of available tools
router.get('/tools', (req: Request, res: Response) => {
  res.json({
    success: true,
    tools: AGENT_TOOLS
  });
});

// POST /api/agent/run - Run the ReAct Agent on a multi-step goal
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { goal, maxIterations = 4 } = req.body;

    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ success: false, error: 'Goal statement is required' });
    }

    const result = await runAgentReActLoop(goal, Number(maxIterations));

    res.json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Agent execution failed';
    res.status(500).json({
      success: false,
      error: 'Agent Execution Failed',
      message: msg
    });
  }
});

export default router;

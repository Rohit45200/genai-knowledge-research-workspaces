import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { validateConfig, config } from './server/config/env';
import documentsRouter from './server/routes/documents';
import searchRouter from './server/routes/search';
import metricsRouter from './server/routes/metrics';
import llmRouter from './server/routes/llm';
import ragRouter from './server/routes/rag';
import agentRouter from './server/routes/agent';
import evaluationRouter from './server/routes/evaluation';

dotenv.config();
validateConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GenAI Knowledge & Research Workspace API',
    version: '1.0.0',
    capabilities: [
      'Document Ingestion & Store',
      'Chunk Management & Inspection',
      'Dense Cosine Vector Database',
      'Hybrid Retrieval (Vector + Keyword)',
      'Grounded RAG Pipeline with Citations',
      'Server-Sent Events Streaming',
      'Agentic ReAct Loop & Autonomous Tool Calling',
      'Ragas-Style LLM-as-a-Judge Evaluation Suite',
      'Gemini 3.8 Flash Integration',
      'LLMOps Telemetry & Logging'
    ]
  });
});

// Register Modular API Routers
app.use('/api/documents', documentsRouter);
app.use('/api/search', searchRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/llm', llmRouter);
app.use('/api/rag', ragRouter);
app.use('/api/agent', agentRouter);
app.use('/api/evaluation', evaluationRouter);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WORKSPACE SERVER] Running at http://localhost:${PORT}`);
    console.log(`[WORKSPACE SERVER] Endpoints: /api/documents, /api/search, /api/rag, /api/agent, /api/evaluation, /api/metrics, /api/llm`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL]: Failed to start server', err);
  process.exit(1);
});

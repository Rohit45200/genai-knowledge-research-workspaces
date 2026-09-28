/**
 * LLMOps, Monitoring & Evaluation Metric Types
 */

export interface LLMMetrics {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  totalToolCalls: number;
  errorCount: number;
  activeDocuments: number;
  indexedChunks: number;
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  type: 'rag' | 'agent' | 'search' | 'evaluation';
  durationMs: number;
  ttftMs?: number; // Time To First Token
  status: 'success' | 'error';
  tokenCount?: number;
  documentCount?: number;
  toolCallsCount?: number;
  error?: string;
}

export interface EvaluationScore {
  id: string;
  timestamp: string;
  query: string;
  answer: string;
  contextRelevance: number; // 0.0 - 1.0
  groundedness: number;     // 0.0 - 1.0
  answerRelevance: number;  // 0.0 - 1.0
  citationAccuracy: number; // 0.0 - 1.0
  overallScore: number;     // 0.0 - 1.0
  reasoning: string;
}

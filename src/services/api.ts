/**
 * Central API Client for Backend Services
 */

import { DocumentMetadata, DocumentChunk } from '../types/document';
import { RetrievedChunk, Citation, RAGQueryResponse, StreamEvent } from '../types/rag';
import { AgentStep, ToolExecutionRecord, AgentTool } from '../types/agent';
import { LLMMetrics, RequestLogEntry, EvaluationScore } from '../types/metrics';

const BASE_URL = '/api';

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  capabilities: string[];
}

export async function fetchHealthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Failed to check health: ${res.statusText}`);
  }
  return res.json();
}

// Document API
export async function fetchDocuments(): Promise<DocumentMetadata[]> {
  const res = await fetch(`${BASE_URL}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data = await res.json();
  return data.documents || [];
}

export async function fetchDocumentChunks(id: string): Promise<{ document: DocumentMetadata; chunks: DocumentChunk[] }> {
  const res = await fetch(`${BASE_URL}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export async function uploadDocument(name: string, content: string, type: string = 'text/plain'): Promise<DocumentMetadata> {
  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content, type })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload document');
  }
  const data = await res.json();
  return data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

// Semantic Vector Search API
export async function searchChunks(
  query: string, 
  topK: number = 5, 
  minSimilarity: number = 0.3,
  documentIds?: string[]
): Promise<RetrievedChunk[]> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK, minSimilarity, documentIds })
  });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results || [];
}

// Complete Grounded RAG Query Pipeline API (Synchronous JSON)
export async function queryRAGPipeline(
  query: string,
  documentIds?: string[],
  topK: number = 4,
  minSimilarity: number = 0.25
): Promise<RAGQueryResponse> {
  const res = await fetch(`${BASE_URL}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, documentIds, topK, minSimilarity, stream: false })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'RAG Query Pipeline failed');
  }
  return res.json();
}

// Streaming Grounded RAG Client via Server-Sent Events (SSE)
export async function streamRAGQuery(
  query: string,
  documentIds: string[] | undefined,
  onEvent: (event: StreamEvent) => void,
  topK: number = 4,
  minSimilarity: number = 0.25
): Promise<void> {
  const response = await fetch(`${BASE_URL}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, documentIds, topK, minSimilarity, stream: true })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming failed with status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        if (jsonStr) {
          try {
            const event: StreamEvent = JSON.parse(jsonStr);
            onEvent(event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  }
}

// Agentic ReAct Runner API
export interface AgentRunResponse {
  success: boolean;
  goal: string;
  steps: AgentStep[];
  toolRecords: ToolExecutionRecord[];
  finalAnswer: string;
  totalDurationMs: number;
}

export async function runAgentGoal(goal: string, maxIterations: number = 4): Promise<AgentRunResponse> {
  const res = await fetch(`${BASE_URL}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, maxIterations })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Agent goal execution failed');
  }
  return res.json();
}

export async function fetchAgentTools(): Promise<AgentTool[]> {
  const res = await fetch(`${BASE_URL}/agent/tools`);
  if (!res.ok) throw new Error('Failed to fetch agent tools');
  const data = await res.json();
  return data.tools || [];
}

// Evaluation Suite API
export async function runEvaluationApi(query: string, expectedGroundTruth?: string, documentIds?: string[]): Promise<EvaluationScore> {
  const res = await fetch(`${BASE_URL}/evaluation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, expectedGroundTruth, documentIds })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Evaluation API failed');
  }
  const data = await res.json();
  return data.evaluation;
}

// Metrics API
export async function fetchMetrics(): Promise<{ metrics: LLMMetrics; logs: RequestLogEntry[] }> {
  const res = await fetch(`${BASE_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  const data = await res.json();
  return {
    metrics: data.metrics,
    logs: data.logs || []
  };
}

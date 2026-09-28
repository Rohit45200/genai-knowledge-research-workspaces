import { LLMMetrics, RequestLogEntry } from '../../src/types/metrics';

/**
 * In-Memory LLMOps Telemetry Tracker
 */
class MetricsTracker {
  private metrics: LLMMetrics = {
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    averageLatencyMs: 0,
    p95LatencyMs: 0,
    totalToolCalls: 0,
    errorCount: 0,
    activeDocuments: 2,
    indexedChunks: 3
  };

  private latencies: number[] = [];
  private logs: RequestLogEntry[] = [];
  private maxLogs: number = 100;

  public recordRequest(entry: Omit<RequestLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: RequestLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.metrics.totalRequests += 1;
    this.latencies.push(entry.durationMs);

    if (entry.status === 'error') {
      this.metrics.errorCount += 1;
    }

    if (entry.tokenCount) {
      this.metrics.totalTokens += entry.tokenCount;
    }

    if (entry.toolCallsCount) {
      this.metrics.totalToolCalls += entry.toolCallsCount;
    }

    // Update Average & p95 latency
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    this.metrics.averageLatencyMs = Math.round(sum / this.latencies.length);

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    this.metrics.p95LatencyMs = sorted[p95Idx] || sorted[sorted.length - 1];
  }

  public updateDocStats(activeDocs: number, indexedChunks: number): void {
    this.metrics.activeDocuments = activeDocs;
    this.metrics.indexedChunks = indexedChunks;
  }

  public getMetrics(): LLMMetrics {
    return { ...this.metrics };
  }

  public getLogs(): RequestLogEntry[] {
    return [...this.logs];
  }
}

export const metricsTracker = new MetricsTracker();

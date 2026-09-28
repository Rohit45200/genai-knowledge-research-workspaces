import React from 'react';
import { Activity, Clock, Zap, Cpu, AlertTriangle, Layers, Database } from 'lucide-react';
import { LLMMetrics, RequestLogEntry } from '../../types/metrics';

interface MetricsDashboardProps {
  metrics: LLMMetrics;
  logs: RequestLogEntry[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  logs
}) => {
  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            {metrics.totalRequests}
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 block">Live API invocations</span>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Avg Response Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
            {metrics.averageLatencyMs}ms
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 block">p95: {metrics.p95LatencyMs}ms</span>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Tokens Processed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-2">
            {metrics.totalTokens.toLocaleString()}
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 block">Prompt + Completion</span>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Vector Chunks Stored</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-2">
            {metrics.indexedChunks}
          </div>
          <span className="text-[10px] text-neutral-500 mt-1 block">Across {metrics.activeDocuments} documents</span>
        </div>
      </div>

      {/* Real-time Telemetry Log Table */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-300">
            Recent Telemetry Logs ({logs.length})
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">Streamed from LLMOps middleware</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
            No telemetry logs recorded yet. Query the workspace to track latency and token consumption.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-[10px] uppercase">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Latency</th>
                  <th className="pb-2">TTFT</th>
                  <th className="pb-2">Tokens</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30">
                    <td className="py-2.5 text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700/60 uppercase">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium">{log.durationMs}ms</td>
                    <td className="py-2.5 text-neutral-400">{log.ttftMs ? `${log.ttftMs}ms` : '—'}</td>
                    <td className="py-2.5 text-amber-300/90">{log.tokenCount ?? '—'}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

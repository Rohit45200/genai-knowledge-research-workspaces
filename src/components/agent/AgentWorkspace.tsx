import React, { useState } from 'react';
import { Bot, Play, Wrench, CheckCircle2, Clock, AlertCircle, ArrowRight, Layers } from 'lucide-react';
import { AgentStep, ToolExecutionRecord } from '../../types/agent';

interface AgentWorkspaceProps {
  onRunGoal: (goal: string) => Promise<void>;
  isRunning: boolean;
  steps: AgentStep[];
  toolRecords: ToolExecutionRecord[];
  finalAnswer?: string;
}

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({
  onRunGoal,
  isRunning,
  steps,
  toolRecords,
  finalAnswer
}) => {
  const [goal, setGoal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isRunning) return;
    await onRunGoal(goal);
  };

  const sampleGoals = [
    'Analyze Document A and Document B and compare their architecture methodologies.',
    'Extract all quantitative statistics from the documents and calculate the average growth rate.',
    'Summarize section 3 and find supporting evidence across all indexed files.'
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Column: Goal Input & Plan Trace */}
      <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Goal Input Form */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Bot className="w-4 h-4" />
            Agentic Research Goal
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="State a complex multi-step research objective..."
              disabled={isRunning}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isRunning || !goal.trim()}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Executing Agent...' : 'Run Agent'}</span>
            </button>
          </form>

          {/* Quick Goals */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {sampleGoals.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setGoal(sample)}
                className="text-[11px] px-2.5 py-1 rounded bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors text-left"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Thought & Plan Trace */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
            Reasoning & Plan Execution Trace
          </div>

          {steps.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
              No active agent workflow. Define a goal above to watch the agent decompose the problem into tool calls.
            </div>
          ) : (
            steps.map((step) => (
              <div
                key={step.stepNumber}
                className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                      {step.stepNumber}
                    </span>
                    Step #{step.stepNumber}: Thought
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                  }`}>
                    {step.status}
                  </span>
                </div>

                <p className="text-neutral-300 leading-relaxed italic bg-neutral-950/40 p-2.5 rounded border border-neutral-800/60">
                  "{step.thought}"
                </p>

                {step.action && (
                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                      Tool Dispatched: <span className="text-indigo-300 font-semibold">{typeof step.action === 'string' ? step.action : step.action.tool}</span>
                    </span>
                    <span className="text-neutral-500">
                      Params: {JSON.stringify(typeof step.action === 'object' ? step.action.params : step.actionInput || {})}
                    </span>
                  </div>
                )}

                {step.observation && (
                  <div className="p-2.5 rounded bg-neutral-950/80 border border-neutral-800/80 text-[11px] space-y-1">
                    <div className="text-[10px] uppercase font-mono text-neutral-500">Observation Result</div>
                    <p className="text-neutral-300 font-mono line-clamp-3">
                      {step.observation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Final Synthesized Answer */}
          {finalAnswer && (
            <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Synthesized Research Outcome
              </div>
              <div className="text-neutral-200 font-sans leading-relaxed whitespace-pre-wrap">
                {finalAnswer}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Tool Registry & Real-Time Logs */}
      <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-400" />
            Registered Agent Tools
          </h3>
          <p className="text-[11px] text-neutral-400 mb-3">
            Autonomous tools accessible by the agent loop:
          </p>
          <div className="space-y-2 text-xs">
            {[
              { name: 'document_search', desc: 'Hybrid semantic & keyword chunk retrieval' },
              { name: 'document_comparison', desc: 'Cross-document differential synthesis' },
              { name: 'summarizer_tool', desc: 'Recursive hierarchical document summarization' },
              { name: 'evidence_extractor', desc: 'Extracts verifiable quotes with page offsets' },
              { name: 'calculator_tool', desc: 'Precise quantitative arithmetic calculations' }
            ].map((tool) => (
              <div key={tool.name} className="p-2 rounded bg-neutral-950 border border-neutral-800/80">
                <span className="font-mono text-indigo-300 font-semibold text-[11px]">{tool.name}</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Tool Execution Records */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
            Tool Execution Logs ({toolRecords.length})
          </div>
          {toolRecords.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
              No tool executions logged yet.
            </div>
          ) : (
            toolRecords.map((record) => (
              <div
                key={record.id}
                className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/70 font-mono text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-indigo-400 font-semibold">{record.toolName}</span>
                  <span className="text-neutral-500 text-[10px]">{record.durationMs}ms</span>
                </div>
                <div className="text-[10px] text-neutral-400 bg-neutral-950 p-2 rounded border border-neutral-800">
                  <span className="text-neutral-500">Input: </span>
                  {JSON.stringify(record.input)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

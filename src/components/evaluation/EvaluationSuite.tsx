import React, { useState } from 'react';
import { CheckCircle2, Play, AlertCircle, ArrowUpRight, BarChart } from 'lucide-react';
import { EvaluationScore } from '../../types/metrics';

interface EvaluationSuiteProps {
  onRunEvaluation: (sampleQuery: string) => Promise<EvaluationScore>;
  isEvaluating: boolean;
  history: EvaluationScore[];
}

export const EvaluationSuite: React.FC<EvaluationSuiteProps> = ({
  onRunEvaluation,
  isEvaluating,
  history
}) => {
  const [testQuery, setTestQuery] = useState('What are the core conclusions and supporting findings?');

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || isEvaluating) return;
    await onRunEvaluation(testQuery);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 0.6) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {/* Triad Definition Banner */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          The RAG Triad Evaluation Standard
        </h3>
        <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
          Automated evaluation measures whether the RAG pipeline is hallucinating or retrieving irrelevant context:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="font-semibold text-indigo-400">1. Context Relevance</span>
            <p className="text-[11px] text-neutral-400">
              Is the retrieved context strictly relevant to the query?
            </p>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="font-semibold text-indigo-400">2. Groundedness</span>
            <p className="text-[11px] text-neutral-400">
              Is the generated answer 100% supported by the retrieved context?
            </p>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="font-semibold text-indigo-400">3. Answer Relevance</span>
            <p className="text-[11px] text-neutral-400">
              Does the answer directly address the user's inquiry?
            </p>
          </div>
        </div>

        {/* Evaluation Runner Input */}
        <form onSubmit={handleRun} className="flex gap-2 pt-3 border-t border-neutral-800">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Query to evaluate against retrieved context..."
            disabled={isEvaluating}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isEvaluating || !testQuery.trim()}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isEvaluating ? 'Evaluating Triad...' : 'Run Triad Evaluation'}</span>
          </button>
        </form>
      </div>

      {/* Historical Evaluation Scores */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <span className="font-semibold uppercase tracking-wider">
            Evaluation Runs ({history.length})
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
            No evaluations run yet. Execute the RAG Triad test above to generate verifiable quality metrics.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono text-neutral-500">Evaluated Query</span>
                  <p className="text-xs font-semibold text-white mt-0.5 font-sans">"{item.query}"</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getScoreColor(item.overallScore)}`}>
                  Overall: {(item.overallScore * 100).toFixed(0)}%
                </div>
              </div>

              {/* Metric Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Context Relevance</div>
                  <div className="text-sm font-semibold font-mono text-neutral-200 mt-1">
                    {(item.contextRelevance * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Groundedness</div>
                  <div className="text-sm font-semibold font-mono text-emerald-400 mt-1">
                    {(item.groundedness * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Answer Relevance</div>
                  <div className="text-sm font-semibold font-mono text-neutral-200 mt-1">
                    {(item.answerRelevance * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Citation Accuracy</div>
                  <div className="text-sm font-semibold font-mono text-indigo-400 mt-1">
                    {(item.citationAccuracy * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-3 rounded-lg bg-neutral-950/70 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
                <span className="font-semibold text-neutral-300 font-mono text-[10px] uppercase block mb-1">
                  Evaluator Rationale:
                </span>
                {item.reasoning}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

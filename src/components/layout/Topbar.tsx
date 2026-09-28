import React from 'react';
import { Sparkles, Shield, Cpu, RefreshCw } from 'lucide-react';
import { WorkspaceTab } from './Sidebar';

interface TopbarProps {
  activeTab: WorkspaceTab;
  isBackendConnected: boolean;
  onRefresh?: () => void;
  selectedDocCount: number;
}

const tabTitles: Record<WorkspaceTab, { title: string; subtitle: string }> = {
  chat: {
    title: 'Grounded RAG Workspace',
    subtitle: 'Ask questions with strict document grounding and verified citations'
  },
  documents: {
    title: 'Document Ingestion & Chunk Inspector',
    subtitle: 'Upload, parse, clean, and inspect recursive chunks'
  },
  search: {
    title: 'Vector Semantic Search',
    subtitle: 'Query document embeddings via high-dimensional cosine similarity'
  },
  agent: {
    title: 'Agentic Research & Tool Execution',
    subtitle: 'Autonomous multi-step research with tool execution transparency'
  },
  evaluation: {
    title: 'RAG Triad Evaluation Suite',
    subtitle: 'Measure Groundedness, Context Relevance, and Answer Relevance'
  },
  metrics: {
    title: 'LLMOps & Telemetry Dashboard',
    subtitle: 'Real-time monitoring of latency, TTFT, token consumption, and errors'
  }
};

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  isBackendConnected,
  onRefresh,
  selectedDocCount
}) => {
  const current = tabTitles[activeTab];

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-6 flex items-center justify-between select-none">
      <div>
        <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          {current.title}
          {selectedDocCount > 0 && activeTab === 'chat' && (
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {selectedDocCount} document{selectedDocCount > 1 ? 's' : ''} active
            </span>
          )}
        </h1>
        <p className="text-xs text-neutral-400">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title="Refresh workspace status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-neutral-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px]">Gemini 2.5 Flash</span>
          </span>

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px]">text-emb-004</span>
          </span>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isBackendConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <Shield className="w-3 h-3" />
            {isBackendConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};

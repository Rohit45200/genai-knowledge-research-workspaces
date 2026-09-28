import React from 'react';
import { 
  FileText, 
  Search, 
  Bot, 
  BarChart3, 
  CheckCircle2, 
  FolderPlus,
  BookOpen
} from 'lucide-react';

export type WorkspaceTab = 'chat' | 'documents' | 'search' | 'agent' | 'evaluation' | 'metrics';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  documentCount: number;
  indexedChunkCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  documentCount,
  indexedChunkCount,
}) => {
  const navItems = [
    {
      id: 'chat' as WorkspaceTab,
      label: 'RAG Workspace',
      description: 'Grounded QA & Citations',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'documents' as WorkspaceTab,
      label: 'Document Library',
      description: 'Ingest & Chunk Inspector',
      icon: FileText,
      badge: documentCount > 0 ? `${documentCount}` : null
    },
    {
      id: 'search' as WorkspaceTab,
      label: 'Semantic Search',
      description: 'Vector Similarity Explorer',
      icon: Search,
      badge: indexedChunkCount > 0 ? `${indexedChunkCount} chunks` : null
    },
    {
      id: 'agent' as WorkspaceTab,
      label: 'Agentic Research',
      description: 'Autonomous Tool Calling',
      icon: Bot,
      badge: 'Agent'
    },
    {
      id: 'evaluation' as WorkspaceTab,
      label: 'RAG Evaluation',
      description: 'Triad Quality Benchmark',
      icon: CheckCircle2,
      badge: null
    },
    {
      id: 'metrics' as WorkspaceTab,
      label: 'LLMOps & Telemetry',
      description: 'Latency, TTFT & Usage',
      icon: BarChart3,
      badge: null
    }
  ];

  return (
    <aside className="w-72 bg-neutral-900/90 border-r border-neutral-800 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-lg">
            K
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight leading-none">GenAI Knowledge</h2>
            <p className="text-xs text-neutral-400 mt-1">Research Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          Core Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive 
                        ? 'bg-indigo-500/20 text-indigo-300' 
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 truncate leading-snug">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workspace Quick Stats Footer */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/40">
        <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80 text-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-[11px]">
              <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
              Indexed Documents
            </span>
            <span className="font-mono text-neutral-200 font-medium">{documentCount}</span>
          </div>
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px]">Vector Chunks</span>
            <span className="font-mono text-neutral-200 font-medium">{indexedChunkCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

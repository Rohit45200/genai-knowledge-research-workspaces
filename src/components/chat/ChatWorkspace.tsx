import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Bot, 
  User, 
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Citation, RetrievedChunk } from '../../types/rag';
import { DocumentMetadata } from '../../types/document';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  retrievedChunks?: RetrievedChunk[];
  latencyMs?: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  isStreaming?: boolean;
}

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => Promise<void>;
  isGenerating: boolean;
  selectedDocuments: DocumentMetadata[];
  onSelectCitation: (citation: Citation) => void;
  activeCitation: Citation | null;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  selectedDocuments,
  onSelectCitation,
  activeCitation
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const query = input;
    setInput('');
    await onSendMessage(query);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Main Conversation Stream */}
      <div className="lg:col-span-8 flex flex-col h-full bg-neutral-900/30 rounded-xl border border-neutral-800 overflow-hidden">
        {/* Active Grounding Context Banner */}
        <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400 truncate">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-neutral-300 font-medium">Grounded Knowledge Scope:</span>
            {selectedDocuments.length === 0 ? (
              <span className="text-amber-400/90 flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3" />
                All workspace documents (or upload documents to restrict)
              </span>
            ) : (
              <span className="text-indigo-400 font-mono text-[11px] truncate">
                {selectedDocuments.map(d => d.name).join(', ')}
              </span>
            )}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Strict RAG</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Grounded Research Assistant</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1 leading-relaxed">
                Ask precise questions about your uploaded documents. Answers will cite specific source passages with verifiable similarity scores.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                {[
                  'What are the core conclusions of the research?',
                  'Summarize the technical architecture described.',
                  'Extract key metrics and quantitative comparisons.'
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 transition-colors text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-xl p-4 space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800/60 pb-1.5 mb-1">
                    <span className="font-semibold uppercase tracking-wider text-neutral-400">
                      {msg.sender === 'user' ? 'You' : 'Workspace RAG'}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.latencyMs && (
                        <span className="font-mono text-neutral-500">{msg.latencyMs}ms</span>
                      )}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-neutral-200 transition-colors"
                        title="Copy answer text"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Citations Footer */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-800">
                      <div className="text-[10px] uppercase font-semibold text-neutral-400 mb-1.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        Grounded Sources ({msg.citations.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite) => (
                          <button
                            key={cite.id}
                            onClick={() => onSelectCitation(cite)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-all ${
                              activeCitation?.id === cite.id
                                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                                : 'bg-neutral-800/60 text-neutral-300 border-neutral-700/60 hover:bg-neutral-800'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[9px]">
                              {cite.sourceNumber}
                            </span>
                            <span className="truncate max-w-[120px]">{cite.documentName}</span>
                            <span className="text-neutral-500 font-mono">
                              {(cite.similarityScore * 100).toFixed(0)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-800 bg-neutral-900/90 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question grounded in your uploaded documents..."
            disabled={isGenerating}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Right Column: Source Evidence Drawer */}
      <div className="lg:col-span-4 flex flex-col h-full bg-neutral-900/40 rounded-xl border border-neutral-800 p-4 overflow-y-auto">
        <div className="border-b border-neutral-800 pb-3 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Citation Evidence & Grounding
          </h3>
          <p className="text-[11px] text-neutral-400 mt-1">
            Click on any citation pill in the response to inspect the exact retrieved chunk and cosine similarity score.
          </p>
        </div>

        {activeCitation ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                    {activeCitation.sourceNumber}
                  </span>
                  Source Citation #{activeCitation.sourceNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                  Score: {(activeCitation.similarityScore * 100).toFixed(1)}% match
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Document: <span className="text-neutral-200 font-medium">{activeCitation.documentName}</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Chunk Index: <span className="font-mono text-neutral-300">#{activeCitation.chunkIndex}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
              <div className="text-[10px] uppercase font-mono text-neutral-500 mb-2">Exact Extracted Passage</div>
              <p className="text-neutral-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-neutral-950/70 p-3 rounded border border-neutral-800">
                "{activeCitation.snippet}"
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
            <BookOpen className="w-8 h-8 text-neutral-700 mb-2" />
            <p>No citation selected.</p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Ask a question to view grounded references and source confidence scores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

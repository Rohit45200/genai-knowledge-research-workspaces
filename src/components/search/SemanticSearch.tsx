import React, { useState } from 'react';
import { Search, Sliders, Database, Layers, ArrowRight } from 'lucide-react';
import { RetrievedChunk } from '../../types/rag';
import { DocumentMetadata } from '../../types/document';

interface SemanticSearchProps {
  documents: DocumentMetadata[];
  onSearch: (query: string, topK: number, minScore: number) => Promise<RetrievedChunk[]>;
  isSearching: boolean;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  documents,
  onSearch,
  isSearching
}) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.4);
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    const res = await onSearch(query, topK, minScore);
    setResults(res);
    setHasSearched(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {/* Search Header & Controls */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts across document embeddings (e.g., 'Transformer attention mechanisms')..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isSearching ? 'Embedding & Searching...' : 'Semantic Search'}</span>
          </button>
        </form>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80 text-xs">
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Top-K Nearest Neighbors
              </span>
              <span className="font-mono text-white font-medium">{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                Minimum Cosine Similarity
              </span>
              <span className="font-mono text-white font-medium">{(minScore * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Results View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <span className="font-semibold uppercase tracking-wider">
            Vector Similarity Matches {hasSearched && `(${results.length} found)`}
          </span>
        </div>

        {hasSearched && results.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
            No chunks met the similarity threshold of {(minScore * 100).toFixed(0)}%. Try lowering the threshold or refining your search term.
          </div>
        ) : (
          results.map((item, idx) => (
            <div
              key={item.chunk.id}
              className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 space-y-2.5 text-xs hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-[10px]">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-white">{item.chunk.documentName}</span>
                  <span className="text-neutral-500 font-mono">Chunk #{item.chunk.chunkIndex}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[10px]">Cosine Similarity:</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                    {(item.similarityScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <p className="text-neutral-300 font-mono text-[11px] leading-relaxed bg-neutral-950/60 p-3 rounded border border-neutral-800">
                {item.chunk.content}
              </p>

              <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 font-mono">
                <span>Chunk ID: {item.chunk.id.slice(0, 12)}...</span>
                <span>~{item.chunk.tokenCountEstimate} tokens</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

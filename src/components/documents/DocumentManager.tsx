import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Calendar,
  Hash
} from 'lucide-react';
import { DocumentMetadata, DocumentChunk } from '../../types/document';

interface DocumentManagerProps {
  documents: DocumentMetadata[];
  selectedDocIds: string[];
  onToggleSelectDoc: (id: string) => void;
  onSelectAllDocs: () => void;
  onClearSelection: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  isUploading: boolean;
  sampleChunks?: DocumentChunk[];
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onSelectAllDocs,
  onClearSelection,
  onUploadFile,
  onDeleteDoc,
  isUploading,
  sampleChunks = []
}) => {
  const [activeChunkDocId, setActiveChunkDocId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await onUploadFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await onUploadFile(file);
      e.target.value = '';
    }
  };

  const activeDocChunks = sampleChunks.filter(
    (c) => activeChunkDocId ? c.documentId === activeChunkDocId : true
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Column: Upload & Ingested Document List */}
      <div className="lg:col-span-7 flex flex-col gap-5 overflow-y-auto pr-1">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
          }`}
          onClick={() => document.getElementById('doc-upload-input')?.click()}
        >
          <input
            id="doc-upload-input"
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.json,.csv"
            onChange={handleFileInput}
            disabled={isUploading}
          />
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UploadCloud className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">
              {isUploading ? 'Processing & Chunking Document...' : 'Upload Research Document'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Supports <span className="text-neutral-300 font-mono">.txt, .md, .pdf, .json, .csv</span> (up to 25MB)
            </p>
          </div>
          <div className="text-[11px] text-neutral-500">
            Recursive chunking and vector embedding generation are performed automatically.
          </div>
        </div>

        {/* Document Selection Controls */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Ingested Documents ({documents.length})
            </span>
          </div>
          {documents.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={onSelectAllDocs}
                className="text-neutral-400 hover:text-indigo-400 text-[11px] font-medium transition-colors"
              >
                Select All
              </button>
              <span className="text-neutral-700">•</span>
              <button
                onClick={onClearSelection}
                className="text-neutral-400 hover:text-neutral-200 text-[11px] transition-colors"
              >
                Deselect
              </button>
            </div>
          )}
        </div>

        {/* Documents Table / Card List */}
        {documents.length === 0 ? (
          <div className="p-8 rounded-xl border border-neutral-800/80 bg-neutral-900/20 text-center flex flex-col items-center justify-center gap-2">
            <FileCode className="w-8 h-8 text-neutral-600 mb-1" />
            <p className="text-sm text-neutral-400 font-medium">No documents uploaded yet</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              Upload research papers, technical specs, or notes to populate your knowledge workspace.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const isInspecting = activeChunkDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-500/40 bg-neutral-900/90 shadow-sm'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectDoc(doc.id)}
                      className="w-4 h-4 rounded border-neutral-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-neutral-900 bg-neutral-800"
                    />
                    <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate max-w-xs md:max-w-sm">
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          {doc.chunkCount} chunks
                        </span>
                        <span>•</span>
                        <span className="font-mono">{(doc.size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-neutral-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setActiveChunkDocId(isInspecting ? null : doc.id)}
                      className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        isInspecting
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                      }`}
                      title="Inspect extracted chunks and embeddings"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Inspect Chunks</span>
                    </button>
                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete document and remove vector embeddings"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Chunk Inspector & Ingestion Pipeline Visualizer */}
      <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Recursive Chunk Inspector
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {activeChunkDocId 
              ? `Viewing chunk partitions for selected document.` 
              : `Select "Inspect Chunks" on any document to see how its text was split, cleaned, and indexed.`}
          </p>
        </div>

        {activeDocChunks.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center text-neutral-500 text-xs">
            No chunks selected for inspection.
          </div>
        ) : (
          <div className="space-y-3">
            {activeDocChunks.map((chunk) => (
              <div 
                key={chunk.id} 
                className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-900/60 text-xs font-mono space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800/80 pb-1.5">
                  <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                    <Hash className="w-3 h-3" />
                    Chunk #{chunk.chunkIndex}
                  </span>
                  <span className="text-neutral-500">
                    ~{chunk.tokenCountEstimate} tokens ({chunk.characterCount} chars)
                  </span>
                </div>
                <p className="text-neutral-300 leading-relaxed font-sans line-clamp-4 hover:line-clamp-none transition-all">
                  {chunk.content}
                </p>
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1">
                  <span>Doc ID: {chunk.documentId.slice(0, 8)}...</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    Embedding Indexed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

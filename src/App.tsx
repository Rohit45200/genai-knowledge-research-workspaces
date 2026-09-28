import { useState, useEffect, useCallback } from 'react';
import { Sidebar, WorkspaceTab } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DocumentManager } from './components/documents/DocumentManager';
import { ChatWorkspace, ChatMessage } from './components/chat/ChatWorkspace';
import { SemanticSearch } from './components/search/SemanticSearch';
import { AgentWorkspace } from './components/agent/AgentWorkspace';
import { EvaluationSuite } from './components/evaluation/EvaluationSuite';
import { MetricsDashboard } from './components/monitoring/MetricsDashboard';
import { DocumentMetadata, DocumentChunk } from './types/document';
import { Citation, RetrievedChunk, StreamEvent } from './types/rag';
import { AgentStep, ToolExecutionRecord } from './types/agent';
import { LLMMetrics, RequestLogEntry, EvaluationScore } from './types/metrics';
import { 
  fetchHealthCheck, 
  fetchDocuments, 
  fetchDocumentChunks,
  uploadDocument, 
  deleteDocument as apiDeleteDoc,
  searchChunks, 
  streamRAGQuery,
  runAgentGoal,
  runEvaluationApi,
  fetchMetrics 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: 'Welcome to the GenAI Knowledge & Research Workspace. Real-time token streaming, multi-step agentic planning, and Ragas-style LLM-as-a-Judge evaluations are active.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Search State
  const [isSearching, setIsSearching] = useState(false);

  // Agent State
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [toolRecords, setToolRecords] = useState<ToolExecutionRecord[]>([]);
  const [agentFinalAnswer, setAgentFinalAnswer] = useState<string | undefined>();
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // Evaluation State
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationScore[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<LLMMetrics>({
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    averageLatencyMs: 0,
    p95LatencyMs: 0,
    totalToolCalls: 0,
    errorCount: 0,
    activeDocuments: 0,
    indexedChunks: 0
  });
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);

  const loadBackendData = useCallback(async () => {
    try {
      await fetchHealthCheck();
      setIsBackendConnected(true);

      const docs = await fetchDocuments();
      setDocuments(docs);

      const chunkPromises = docs.map(d => fetchDocumentChunks(d.id).catch(() => null));
      const chunkResults = await Promise.all(chunkPromises);
      const allExtractedChunks: DocumentChunk[] = [];
      chunkResults.forEach(res => {
        if (res?.chunks) allExtractedChunks.push(...res.chunks);
      });
      setChunks(allExtractedChunks);

      const m = await fetchMetrics();
      setMetrics(m.metrics);
      setLogs(m.logs);
    } catch (err) {
      console.error('Failed to sync with backend:', err);
      setIsBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Document Handlers
  const handleToggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds(documents.map(d => d.id));
  };

  const handleClearSelection = () => {
    setSelectedDocIds([]);
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const text = await file.text();
      await uploadDocument(file.name, text, file.type || 'text/plain');
      await loadBackendData();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await apiDeleteDoc(id);
      await loadBackendData();
      setSelectedDocIds(prev => prev.filter(x => x !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Real-Time Streaming RAG via Server-Sent Events (SSE)
  const handleSendMessage = async (query: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    const assistantMsgId = `msg-${Date.now() + 1}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
      citations: []
    };

    setMessages(prev => [...prev, userMsg, initialAssistantMsg]);
    setIsGenerating(true);

    try {
      await streamRAGQuery(
        query,
        selectedDocIds.length > 0 ? selectedDocIds : undefined,
        (event: StreamEvent) => {
          if (event.type === 'citation') {
            const data = event.data as { citations: Citation[]; retrievedChunks: RetrievedChunk[] };
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  citations: data.citations,
                  retrievedChunks: data.retrievedChunks
                };
              }
              return m;
            }));
            if (data.citations.length > 0) {
              setActiveCitation(data.citations[0]);
            }
          } else if (event.type === 'token') {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  content: m.content + (event.content || '')
                };
              }
              return m;
            }));
          } else if (event.type === 'done') {
            const stats = event.data as { latencyMs?: number; ttftMs?: number };
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  isStreaming: false,
                  latencyMs: stats.latencyMs
                };
              }
              return m;
            }));
          } else if (event.type === 'error') {
            setMessages(prev => prev.map(m => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  isStreaming: false,
                  content: m.content + `\n\n⚠️ Streaming Error: ${event.content}`
                };
              }
              return m;
            }));
          }
        },
        4,
        0.25
      );

      const m = await fetchMetrics();
      setMetrics(m.metrics);
      setLogs(m.logs);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Streaming failed';
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId) {
          return {
            ...m,
            isStreaming: false,
            content: `⚠️ Generation Error: ${errorMsg}`
          };
        }
        return m;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Semantic Search Handlers
  const handleSearch = async (query: string, topK: number, minScore: number): Promise<RetrievedChunk[]> => {
    setIsSearching(true);
    try {
      const results = await searchChunks(
        query, 
        topK, 
        minScore, 
        selectedDocIds.length > 0 ? selectedDocIds : undefined
      );
      const m = await fetchMetrics();
      setMetrics(m.metrics);
      setLogs(m.logs);
      return results;
    } finally {
      setIsSearching(false);
    }
  };

  // Agentic ReAct Goal Execution
  const handleRunGoal = async (goalText: string) => {
    setIsAgentRunning(true);
    setAgentSteps([]);
    setToolRecords([]);
    setAgentFinalAnswer(undefined);

    try {
      const res = await runAgentGoal(goalText, 4);
      setAgentSteps(res.steps);
      setToolRecords(res.toolRecords);
      setAgentFinalAnswer(res.finalAnswer);

      const m = await fetchMetrics();
      setMetrics(m.metrics);
      setLogs(m.logs);
    } catch (err) {
      console.error('Agent goal execution failed:', err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // Ragas-Style Quality Evaluation Runner
  const handleRunEvaluation = async (sampleQuery: string): Promise<EvaluationScore> => {
    setIsEvaluating(true);
    try {
      const evalResult = await runEvaluationApi(
        sampleQuery, 
        undefined, 
        selectedDocIds.length > 0 ? selectedDocIds : undefined
      );
      setEvaluationHistory(prev => [evalResult, ...prev]);

      const m = await fetchMetrics();
      setMetrics(m.metrics);
      setLogs(m.logs);
      return evalResult;
    } catch (err) {
      console.error('Evaluation run failed:', err);
      throw err;
    } finally {
      setIsEvaluating(false);
    }
  };

  const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        documentCount={documents.length}
        indexedChunkCount={chunks.length}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          activeTab={activeTab}
          isBackendConnected={isBackendConnected}
          selectedDocCount={selectedDocIds.length}
          onRefresh={loadBackendData}
        />

        <main className="flex-1 p-6 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatWorkspace
              messages={messages}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              selectedDocuments={selectedDocs}
              onSelectCitation={setActiveCitation}
              activeCitation={activeCitation}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentManager
              documents={documents}
              selectedDocIds={selectedDocIds}
              onToggleSelectDoc={handleToggleSelectDoc}
              onSelectAllDocs={handleSelectAllDocs}
              onClearSelection={handleClearSelection}
              onUploadFile={handleUploadFile}
              onDeleteDoc={handleDeleteDoc}
              isUploading={isUploading}
              sampleChunks={chunks}
            />
          )}

          {activeTab === 'search' && (
            <SemanticSearch
              documents={documents}
              onSearch={handleSearch}
              isSearching={isSearching}
            />
          )}

          {activeTab === 'agent' && (
            <AgentWorkspace
              onRunGoal={handleRunGoal}
              isRunning={isAgentRunning}
              steps={agentSteps}
              toolRecords={toolRecords}
              finalAnswer={agentFinalAnswer}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationSuite
              onRunEvaluation={handleRunEvaluation}
              isEvaluating={isEvaluating}
              history={evaluationHistory}
            />
          )}

          {activeTab === 'metrics' && (
            <MetricsDashboard
              metrics={metrics}
              logs={logs}
            />
          )}
        </main>
      </div>
    </div>
  );
}

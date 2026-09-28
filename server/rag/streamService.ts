import { Response } from 'express';
import { getGeminiClient, GEMINI_TEXT_MODEL } from '../core/gemini';
import { retrieveHybridChunks } from '../rag/retriever';
import { buildGroundedRAGPrompt } from '../rag/promptBuilder';
import { Citation, StreamEvent } from '../../src/types/rag';
import { metricsTracker } from '../monitoring/metricsTracker';

export interface StreamRAGOptions {
  query: string;
  documentIds?: string[];
  topK?: number;
  minSimilarity?: number;
  temperature?: number;
}

/**
 * Handles Server-Sent Events (SSE) streaming for grounded RAG queries.
 * Emits:
 * - 'citation' events when context chunks are retrieved
 * - 'token' events as Gemini 3.8 Flash yields chunks
 * - 'done' event with final latency and telemetry stats
 */
export async function streamGroundedRAG(
  options: StreamRAGOptions,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  const {
    query,
    documentIds,
    topK = 4,
    minSimilarity = 0.25,
    temperature = 0.2
  } = options;

  // Set standard SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders?.();

  const sendEvent = (event: StreamEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    // Step 1: Hybrid Semantic Retrieval
    const retrievedChunks = await retrieveHybridChunks({
      query,
      topK,
      minSimilarity,
      documentIds
    });

    const contextChunks = retrievedChunks.map(r => r.chunk);

    // Step 2: Handle Zero Context
    if (contextChunks.length === 0) {
      sendEvent({
        type: 'token',
        content: "I cannot find sufficient evidence in the provided documents to answer this question. Please upload relevant documentation or adjust your search scope."
      });
      sendEvent({ type: 'done', data: { latencyMs: Date.now() - startTime } });
      res.end();
      return;
    }

    // Step 3: Emit Citations Early so UI populates the source drawer immediately
    const citations: Citation[] = retrievedChunks.map((rc, idx) => ({
      id: `cite-${Date.now()}-${idx + 1}`,
      sourceNumber: idx + 1,
      documentId: rc.chunk.documentId,
      documentName: rc.chunk.documentName,
      chunkId: rc.chunk.id,
      chunkIndex: rc.chunk.chunkIndex,
      snippet: rc.chunk.content,
      similarityScore: rc.similarityScore
    }));

    sendEvent({
      type: 'citation',
      data: { citations, retrievedChunks }
    });

    // Step 4: Build Grounded Prompt
    const { systemInstruction, contents } = buildGroundedRAGPrompt({
      userQuery: query,
      contextChunks
    });

    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Offline mock streaming simulation for development
      const mockText = `Based on the provided documents:\n\n1. **Chunking & Overlap**: Recursive chunking with 500 characters and 100 character overlap preserves context across sentence splits [Source 1].\n2. **Vector Space**: Queries and text passages are projected into a 768-dimensional space using gemini-embedding-2-preview and matched via cosine similarity [Source 2].\n3. **Agent Workflow**: Research tasks requiring multiple steps invoke autonomous tools using a Thought-Action-Observation loop [Source 3].`;
      
      const words = mockText.split(' ');
      for (const word of words) {
        if (!firstTokenTime) firstTokenTime = Date.now();
        sendEvent({ type: 'token', content: word + ' ' });
        await new Promise(r => setTimeout(r, 25));
      }

      const totalDuration = Date.now() - startTime;
      const ttft = firstTokenTime ? firstTokenTime - startTime : totalDuration;

      metricsTracker.recordRequest({
        type: 'rag',
        durationMs: totalDuration,
        ttftMs: ttft,
        status: 'success',
        tokenCount: 180
      });

      sendEvent({
        type: 'done',
        data: {
          latencyMs: totalDuration,
          ttftMs: ttft
        }
      });
      res.end();
      return;
    }

    // Step 5: Live Streaming via @google/genai SDK
    const responseStream = await ai.models.generateContentStream({
      model: GEMINI_TEXT_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature,
        maxOutputTokens: 1500
      }
    });

    let fullAnswer = '';

    for await (const chunk of responseStream) {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }
      const token = chunk.text || '';
      if (token) {
        fullAnswer += token;
        sendEvent({
          type: 'token',
          content: token
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const ttft = firstTokenTime ? firstTokenTime - startTime : totalDuration;

    metricsTracker.recordRequest({
      type: 'rag',
      durationMs: totalDuration,
      ttftMs: ttft,
      status: 'success',
      tokenCount: Math.ceil(fullAnswer.length / 4)
    });

    sendEvent({
      type: 'done',
      data: {
        latencyMs: totalDuration,
        ttftMs: ttft
      }
    });

    res.end();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Streaming RAG failed';
    console.error('[STREAMING RAG ERROR]:', errMsg);
    sendEvent({
      type: 'error',
      content: errMsg
    });
    res.end();
  }
}

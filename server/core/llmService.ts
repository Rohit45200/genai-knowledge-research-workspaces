import { getGeminiClient, GEMINI_TEXT_MODEL } from '../core/gemini';
import { generateContentWithResilience } from '../core/modelResilience';
import { buildGroundedRAGPrompt } from '../rag/promptBuilder';
import { DocumentChunk } from '../../src/types/document';
import { metricsTracker } from '../monitoring/metricsTracker';

export interface GenerationOptions {
  query: string;
  contextChunks: DocumentChunk[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerationResult {
  text: string;
  latencyMs: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

/**
 * Executes a grounded generation query against Gemini 3.8 Flash.
 * Falls back gracefully to structured synthesis if API key is not yet configured.
 */
export async function generateGroundedResponse(
  options: GenerationOptions
): Promise<GenerationResult> {
  const startTime = Date.now();
  const { query, contextChunks, temperature = 0.2, maxOutputTokens = 1500 } = options;

  const { systemInstruction, contents } = buildGroundedRAGPrompt({
    userQuery: query,
    contextChunks
  });

  const ai = getGeminiClient();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Graceful offline mock synthesis for local testing when no live key is present
    const latencyMs = Date.now() - startTime + 120;
    const fallbackText = contextChunks.length > 0
      ? `Based on the provided documents:\n\n${contextChunks.map((c, i) => `• [Source ${i + 1}] (${c.documentName}): ${c.content}`).join('\n\n')}\n\n*Note: Set your GEMINI_API_KEY in .env to enable live Gemini 3.8 Flash synthesis.*`
      : 'I cannot find sufficient evidence in the provided documents to answer this question.';

    metricsTracker.recordRequest({
      type: 'rag',
      durationMs: latencyMs,
      status: 'success',
      tokenCount: 150
    });

    return {
      text: fallbackText,
      latencyMs,
      tokensUsed: { promptTokens: 90, completionTokens: 60, totalTokens: 150 }
    };
  }

  try {
    const response = await generateContentWithResilience({
      contents,
      config: {
        systemInstruction,
        temperature,
        maxOutputTokens
      }
    });

    const latencyMs = Date.now() - startTime;
    const responseText = response.text || 'No response generated.';
    const usage = response.usageMetadata;

    const tokensUsed = usage ? {
      promptTokens: usage.promptTokenCount || 0,
      completionTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0
    } : undefined;

    metricsTracker.recordRequest({
      type: 'rag',
      durationMs: latencyMs,
      status: 'success',
      tokenCount: tokensUsed?.totalTokens
    });

    return {
      text: responseText,
      latencyMs,
      tokensUsed,
      finishReason: response.candidates?.[0]?.finishReason
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[GEMINI GENERATE ERROR]:', errMsg);

    metricsTracker.recordRequest({
      type: 'rag',
      durationMs: latencyMs,
      status: 'error',
      error: errMsg
    });

    throw error;
  }
}

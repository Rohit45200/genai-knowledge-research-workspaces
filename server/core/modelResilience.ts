import { getGeminiClient, GEMINI_TEXT_MODEL } from './gemini';

// Fallback models in priority order using officially supported models:
// 1. Primary: gemini-3.8-flash (Standard text & reasoning)
// 2. Fallback: gemini-3.1-flash-lite (High-throughput, lowest latency fallback)
// 3. Fallback: gemini-flash-latest (General alias)
export const TEXT_MODEL_FALLBACKS = [
  GEMINI_TEXT_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

/**
 * Checks whether an error is transient (e.g. 503 Service Unavailable, 429 Rate Limit)
 */
export function isTransientModelError(error: unknown): boolean {
  if (!error) return false;
  const errStr = typeof error === 'string' ? error : (error instanceof Error ? error.message : JSON.stringify(error));
  return (
    errStr.includes('503') ||
    errStr.includes('UNAVAILABLE') ||
    errStr.includes('high demand') ||
    errStr.includes('temporarily unavailable') ||
    errStr.includes('ResourceExhausted') ||
    errStr.includes('429')
  );
}

/**
 * Executes generateContent with automatic exponential backoff retry and model fallback
 */
export async function generateContentWithResilience(params: {
  contents: unknown;
  config?: Record<string, unknown>;
  maxRetriesPerModel?: number;
}) {
  const ai = getGeminiClient();
  const maxRetries = params.maxRetriesPerModel ?? 2;
  const modelsToTry = Array.from(new Set(TEXT_MODEL_FALLBACKS));

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff with jitter: 1s, 2s, etc.
          const delayMs = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
          console.warn(`[GEMINI RETRY] Retrying ${model} (attempt ${attempt + 1}/${maxRetries + 1}) after ${Math.round(delayMs)}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
        }

        // Call SDK generateContent
        const response = await ai.models.generateContent({
          model,
          contents: params.contents as any,
          config: params.config as any
        });

        return response;
      } catch (err: unknown) {
        lastError = err;
        const isTransient = isTransientModelError(err);
        console.warn(`[GEMINI MODEL ATTEMPT FAILED] Model: ${model}, Attempt: ${attempt + 1}, Transient: ${isTransient}`);

        if (!isTransient) {
          // Non-transient error (e.g. invalid API key, malformed prompt); do not retry this model
          break;
        }
      }
    }
  }

  throw lastError;
}

/**
 * Executes generateContentStream with automatic fallback across models on 503/transient errors
 */
export async function generateContentStreamWithResilience(params: {
  contents: unknown;
  config?: Record<string, unknown>;
}) {
  const ai = getGeminiClient();
  const modelsToTry = Array.from(new Set(TEXT_MODEL_FALLBACKS));
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: params.contents as any,
        config: params.config as any
      });
      return { stream: responseStream, modelUsed: model };
    } catch (err: unknown) {
      lastError = err;
      if (isTransientModelError(err)) {
        console.warn(`[STREAMING FALLBACK] Model ${model} returned 503/high demand. Switching to alternative model...`);
        // Small delay before switching model
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

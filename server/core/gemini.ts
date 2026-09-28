import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';

let aiInstance: GoogleGenAI | null = null;

/**
 * Returns a configured GoogleGenAI instance.
 * Automatically utilizes process.env.GEMINI_API_KEY.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('[GEMINI CLIENT] Warning: GEMINI_API_KEY is not defined in environment.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const GEMINI_TEXT_MODEL = config.geminiModel;
export const GEMINI_EMBEDDING_MODEL = config.embeddingModel;

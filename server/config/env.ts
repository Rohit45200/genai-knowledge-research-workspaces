/**
 * Environment configuration validator
 */
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview',
  defaultTopK: 5,
  defaultMinSimilarity: 0.4,
  maxUploadSizeBytes: 25 * 1024 * 1024 // 25MB
};

export function validateConfig() {
  if (!config.geminiApiKey) {
    console.warn('[CONFIG WARNING] GEMINI_API_KEY is not set. Gemini API calls will require an injected key from environment variables.');
  }
}

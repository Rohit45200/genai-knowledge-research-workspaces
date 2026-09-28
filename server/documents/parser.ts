import { cleanDocumentText } from './cleaner';

export interface ParsedDocument {
  name: string;
  type: string;
  rawText: string;
  cleanedText: string;
  characterCount: number;
  wordCount: number;
  metadata: {
    format: string;
    sectionCount: number;
    estimatedTokens: number;
  };
}

/**
 * Universal Multi-Format Document Parser
 * Ingests raw buffers or strings for Markdown, TXT, JSON, CSV, and PDF representations.
 */
export function parseDocument(
  fileName: string,
  rawContent: string | Buffer,
  mimeType?: string
): ParsedDocument {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'txt';
  let rawText = '';

  if (typeof rawContent === 'string') {
    rawText = rawContent;
  } else if (Buffer.isBuffer(rawContent)) {
    rawText = rawContent.toString('utf-8');
  }

  // Handle format-specific extraction
  let extractedText = rawText;

  if (extension === 'json') {
    try {
      const parsedJson = JSON.parse(rawText);
      // If JSON is array or object, format key-values cleanly for semantic chunking
      extractedText = formatJsonForRAG(parsedJson);
    } catch {
      extractedText = rawText;
    }
  } else if (extension === 'csv') {
    extractedText = formatCsvForRAG(rawText);
  } else if (extension === 'pdf') {
    // For text-extracted PDF payloads or Base64/plain stream representations
    extractedText = extractPdfText(rawText);
  }

  const cleanedText = cleanDocumentText(extractedText);
  const words = cleanedText.split(/\s+/).filter(Boolean);
  const sections = cleanedText.split(/\n\n+/).filter(s => s.trim().length > 0);

  return {
    name: fileName,
    type: mimeType || getMimeType(extension),
    rawText,
    cleanedText,
    characterCount: cleanedText.length,
    wordCount: words.length,
    metadata: {
      format: extension,
      sectionCount: sections.length,
      estimatedTokens: Math.ceil(cleanedText.length / 4)
    }
  };
}

function getMimeType(ext: string): string {
  switch (ext) {
    case 'md': return 'text/markdown';
    case 'json': return 'application/json';
    case 'csv': return 'text/csv';
    case 'pdf': return 'application/pdf';
    default: return 'text/plain';
  }
}

/**
 * Transforms JSON data into readable declarative semantic sentences.
 */
function formatJsonForRAG(data: unknown, prefix: string = ''): string {
  if (Array.isArray(data)) {
    return data.map((item, idx) => `Item ${idx + 1}:\n${formatJsonForRAG(item, prefix + '  ')}`).join('\n\n');
  }
  if (data !== null && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${prefix}${key}:\n${formatJsonForRAG(value, prefix + '  ')}`;
        }
        return `${prefix}${key}: ${value}`;
      })
      .join('\n');
  }
  return `${prefix}${String(data)}`;
}

/**
 * Transforms CSV rows into semantic header-value relationships.
 */
function formatCsvForRAG(csvText: string): string {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return csvText;

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1);

  return rows.map((row, rIdx) => {
    const cols = row.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const entry = headers
      .map((header, hIdx) => `${header}: ${cols[hIdx] ?? ''}`)
      .join(' | ');
    return `Record #${rIdx + 1}: ${entry}`;
  }).join('\n');
}

/**
 * Sanitizes PDF text dumps (e.g. removes PDF object stream artifacts if raw buffer is passed)
 */
function extractPdfText(text: string): string {
  // If text contains PDF binary headers, extract textual chunks matching stream blocks
  if (text.includes('%PDF-')) {
    const textMatches = text.match(/\(([^)]+)\)\s*Tj/g) || text.match(/\[([^\]]+)\]\s*TJ/g);
    if (textMatches && textMatches.length > 0) {
      return textMatches.map(m => m.replace(/^[([\\s]+|[)\]\\s]+T[jJ]$/g, '')).join(' ');
    }
  }
  return text;
}

import { cleanDocumentText } from './cleaner';
// @ts-ignore
import * as pdfParseModule from 'pdf-parse';

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
 * Ingests raw buffers, Base64 strings, or text for Markdown, TXT, JSON, CSV, and PDF representations.
 */
export async function parseDocument(
  fileName: string,
  rawContent: string | Buffer,
  mimeType?: string
): Promise<ParsedDocument> {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'txt';
  let rawText = '';
  let extractedText = '';

  const isPdf = extension === 'pdf' || mimeType === 'application/pdf';

  if (isPdf) {
    try {
      let pdfBuffer: Buffer;
      if (Buffer.isBuffer(rawContent)) {
        pdfBuffer = rawContent;
      } else if (typeof rawContent === 'string') {
        if (rawContent.startsWith('data:application/pdf;base64,')) {
          const base64Data = rawContent.replace(/^data:application\/pdf;base64,/, '');
          pdfBuffer = Buffer.from(base64Data, 'base64');
        } else if (/^[A-Za-z0-9+/=]+$/.test(rawContent.trim().slice(0, 100)) && rawContent.length > 200) {
          pdfBuffer = Buffer.from(rawContent.trim(), 'base64');
        } else {
          // Fallback if sent as binary string
          pdfBuffer = Buffer.from(rawContent, 'binary');
        }
      } else {
        pdfBuffer = Buffer.from([]);
      }

      // Check if module provides PDFParse class or callable function
      const PDFClass = (pdfParseModule as any).PDFParse;
      if (typeof PDFClass === 'function') {
        const parser = new PDFClass({ data: pdfBuffer });
        const res = await parser.getText();
        extractedText = res?.text || '';
      } else if (typeof (pdfParseModule as any).default === 'function') {
        const res = await (pdfParseModule as any).default(pdfBuffer);
        extractedText = res?.text || '';
      } else if (typeof pdfParseModule === 'function') {
        const res = await (pdfParseModule as any)(pdfBuffer);
        extractedText = res?.text || '';
      }

      if (!extractedText && typeof rawContent === 'string') {
        extractedText = extractPdfTextFallback(rawContent);
      }
      rawText = extractedText;
    } catch (pdfErr) {
      console.warn('PDF parsing error, falling back to raw text extraction:', pdfErr);
      extractedText = typeof rawContent === 'string' ? extractPdfTextFallback(rawContent) : '';
      rawText = extractedText;
    }
  } else {
    if (typeof rawContent === 'string') {
      rawText = rawContent;
    } else if (Buffer.isBuffer(rawContent)) {
      rawText = rawContent.toString('utf-8');
    }

    if (extension === 'json') {
      try {
        const parsedJson = JSON.parse(rawText);
        extractedText = formatJsonForRAG(parsedJson);
      } catch {
        extractedText = rawText;
      }
    } else if (extension === 'csv') {
      extractedText = formatCsvForRAG(rawText);
    } else {
      extractedText = rawText;
    }
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
 * Fallback regex-based extraction if pdf-parse fails on malformed files
 */
function extractPdfTextFallback(text: string): string {
  if (text.includes('%PDF-')) {
    const textMatches = text.match(/\(([^)]+)\)\s*Tj/g) || text.match(/\[([^\]]+)\]\s*TJ/g);
    if (textMatches && textMatches.length > 0) {
      return textMatches.map(m => m.replace(/^[([\\s]+|[)\]\\s]+T[jJ]$/g, '')).join(' ');
    }
  }
  return text;
}

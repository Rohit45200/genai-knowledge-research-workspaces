/**
 * Document Cleaner & Sanitizer
 * Strips noisy formatting, normalizes unicode, handles control characters,
 * and fixes irregular line breaks without destroying meaningful paragraph boundaries.
 */

export interface CleaningOptions {
  stripHtml?: boolean;
  normalizeWhitespace?: boolean;
  removeControlChars?: boolean;
  standardizeQuotes?: boolean;
}

export function cleanDocumentText(rawText: string, options: CleaningOptions = {}): string {
  const {
    stripHtml = true,
    normalizeWhitespace = true,
    removeControlChars = true,
    standardizeQuotes = true
  } = options;

  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Strip HTML tags if present (e.g. from pasted web articles or converted documents)
  if (stripHtml) {
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, ' ');
  }

  // 2. Remove non-printable control characters (except tabs and line breaks)
  if (removeControlChars) {
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // 3. Standardize unicode quotes and dashes (e.g. curly quotes to ASCII)
  if (standardizeQuotes) {
    cleaned = cleaned
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...');
  }

  // 4. Normalize line breaks to standard \n
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 5. Normalize irregular whitespace while preserving double newlines for paragraph breaks
  if (normalizeWhitespace) {
    // Replace tabs or multiple spaces within a line with a single space
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    // Collapse 3 or more consecutive newlines into exactly 2 newlines (paragraph boundary)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  }

  return cleaned.trim();
}

import { DocumentChunk } from '../../src/types/document';

export interface PromptTemplateOptions {
  systemInstruction?: string;
  userQuery: string;
  contextChunks: DocumentChunk[];
  citationInstruction?: boolean;
}

/**
 * Enterprise Grounded RAG Prompt Template
 * Separates System Rules, Grounding Context, and User Query
 */
export function buildGroundedRAGPrompt(options: PromptTemplateOptions): {
  systemInstruction: string;
  contents: string;
} {
  const {
    systemInstruction,
    userQuery,
    contextChunks,
    citationInstruction = true
  } = options;

  const defaultSystem = `You are a precision research assistant in a GenAI Knowledge Workspace.
Your mission is to provide strictly factual, grounded answers based EXCLUSIVELY on the provided Document Context sections.

STRICT GROUNDING RULES:
1. Only answer based on information present in the provided Document Context.
2. If the context does not contain enough information to answer the question, state: "I cannot find sufficient evidence in the provided documents to answer this question." Do not extrapolate, assume, or invent details.
3. Every factual claim, number, statistic, or core insight MUST be cited using the format [Source N], where N corresponds to the assigned Source ID.
4. Maintain a clear, objective, professional tone suitable for engineering and research reports.
5. You may format your answer using markdown, bullet points, and code blocks where helpful.`;

  // Format retrieved chunks with clear separation and source indices
  const formattedContext = contextChunks.length > 0
    ? contextChunks.map((chunk, index) => {
        return `--- DOCUMENT SOURCE [${index + 1}] ---
Document: ${chunk.documentName}
Chunk Index: ${chunk.chunkIndex}
Content:
${chunk.content}
---------------------------------------`;
      }).join('\n\n')
    : 'No relevant document context found.';

  const contents = `DOCUMENT CONTEXT:
${formattedContext}

USER INQUIRY:
${userQuery}

${citationInstruction ? 'INSTRUCTIONS: Generate a thorough, grounded answer adhering to the system rules. Include [Source N] citation brackets for all statements supported by the context.' : ''}`;

  return {
    systemInstruction: systemInstruction || defaultSystem,
    contents
  };
}

import { AgentTool } from '../../src/types/agent';
import { vectorStore } from '../db/vectorStore';
import { documentStore } from '../db/documentStore';

/**
 * Registry of deterministic tools available to the Agentic Reasoner
 */
export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'semantic_search',
    description: 'Searches the vector database for relevant passages across ingested documents using cosine similarity.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query or keyword statement to find in the documents.',
        required: true
      },
      {
        name: 'topK',
        type: 'number',
        description: 'Number of results to retrieve (default: 3).',
        required: false
      }
    ]
  },
  {
    name: 'calculator',
    description: 'Safely evaluates mathematical expressions, token formulas, and statistical ratios.',
    parameters: [
      {
        name: 'expression',
        type: 'string',
        description: 'Mathematical expression to compute (e.g. "500 / 4", "(14200 + 28400) / 1024").',
        required: true
      }
    ]
  },
  {
    name: 'summarize_document',
    description: 'Retrieves metadata and an executive summary of an indexed document by its name.',
    parameters: [
      {
        name: 'documentName',
        type: 'string',
        description: 'The exact or partial file name of the document (e.g. "rag_architecture_spec.md").',
        required: true
      }
    ]
  }
];

/**
 * Executes a tool invocation requested by the Agent
 */
export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'semantic_search': {
      const query = String(args.query || '');
      const topK = Number(args.topK || 3);
      const results = await vectorStore.search({ queryText: query, topK, minSimilarity: 0.25 });
      if (results.length === 0) {
        return 'No relevant passages found in the vector database matching the query.';
      }
      return results.map((r, i) => `[Result ${i + 1}] (${r.chunk.documentName}, chunk ${r.chunk.chunkIndex}, score: ${(r.similarityScore * 100).toFixed(1)}%):\n"${r.chunk.content}"`).join('\n\n');
    }

    case 'calculator': {
      const expr = String(args.expression || '').trim();
      // Safe math evaluator: only allow numbers, arithmetic operators, parentheses, and spaces
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        return 'Error: Invalid mathematical expression. Only digits and operators (+, -, *, /, ()) are allowed.';
      }
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        return `Calculation Result: ${result}`;
      } catch (err) {
        return `Error evaluating expression: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    case 'summarize_document': {
      const docName = String(args.documentName || '').toLowerCase();
      const docs = documentStore.getAllDocuments();
      const matched = docs.find(d => d.name.toLowerCase().includes(docName));
      if (!matched) {
        return `Document matching "${docName}" not found in library. Available documents: ${docs.map(d => d.name).join(', ')}`;
      }
      return `Document Summary for "${matched.name}":\n- Size: ${matched.size} bytes\n- Word Count: ${matched.wordCount}\n- Chunks: ${matched.chunkCount}\n- Summary: ${matched.summary}`;
    }

    default:
      return `Error: Unknown tool "${toolName}". Available tools: ${AGENT_TOOLS.map(t => t.name).join(', ')}`;
  }
}

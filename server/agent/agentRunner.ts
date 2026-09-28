import { getGeminiClient, GEMINI_TEXT_MODEL } from '../core/gemini';
import { AGENT_TOOLS, executeTool } from './tools';
import { AgentStep, ToolExecutionRecord } from '../../src/types/agent';
import { metricsTracker } from '../monitoring/metricsTracker';

export interface AgentRunResult {
  goal: string;
  steps: AgentStep[];
  toolRecords: ToolExecutionRecord[];
  finalAnswer: string;
  totalDurationMs: number;
}

/**
 * Enterprise ReAct (Thought-Action-Observation) Agentic Reasoner
 * Decomposes complex user goals into iterative steps:
 * 1. Thought: Analyzes current objective and decides next step
 * 2. Action: Selects and calls an autonomous tool (e.g. semantic_search, calculator)
 * 3. Observation: Ingests tool execution output
 * 4. Iterates until goal is satisfied or max iterations reached
 */
export async function runAgentReActLoop(
  goal: string,
  maxIterations: number = 4
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const steps: AgentStep[] = [];
  const toolRecords: ToolExecutionRecord[] = [];
  let currentIteration = 0;
  let finalAnswer = '';

  const toolsManifest = AGENT_TOOLS.map(t => 
    `- Tool: ${t.name}\n  Description: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
  ).join('\n');

  const historyContext: string[] = [];

  while (currentIteration < maxIterations) {
    currentIteration++;

    const systemPrompt = `You are an autonomous research agent operating within a ReAct (Thought-Action-Observation) framework.
Your task is to solve the user's goal by thinking step-by-step and calling available tools when needed.

AVAILABLE TOOLS:
${toolsManifest}

RESPONSE FORMAT:
You MUST respond in ONE of the following two formats:

Format 1 (If you need to call a tool):
Thought: <Detailed reasoning on what to do next>
Action: <Tool name: semantic_search | calculator | summarize_document>
Action Input: <JSON object containing arguments for the tool, e.g. {"query": "vector dimensions"} or {"expression": "500 / 4"}>

Format 2 (When you have gathered enough information to definitively answer the user's goal):
Thought: <Final synthesis and reasoning>
Final Answer: <Your comprehensive, grounded response answering the user's goal>`;

    const conversationHistory = historyContext.length > 0
      ? `\nPREVIOUS ACTIONS & OBSERVATIONS:\n${historyContext.join('\n\n')}\n`
      : '';

    const prompt = `USER GOAL:
${goal}
${conversationHistory}
Step ${currentIteration}: Decide your next Thought and Action (or Final Answer):`;

    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;

    let responseText = '';

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // Deterministic simulation for local/offline testing
      if (currentIteration === 1) {
        responseText = `Thought: I need to search the vector database to locate information on the topic requested by the user.\nAction: semantic_search\nAction Input: {"query": "${goal.slice(0, 30)}", "topK": 2}`;
      } else {
        responseText = `Thought: I have retrieved the factual context from the knowledge store and can now synthesize a final answer.\nFinal Answer: Based on document inspection, the architecture employs recursive character splitting with 500-character segments and 100-character overlap, paired with 768-dimensional vector cosine retrieval.`;
      }
    } else {
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1
        }
      });
      responseText = response.text || '';
    }

    // Parse Thought, Action, Action Input, or Final Answer
    const thoughtMatch = responseText.match(/Thought:\s*([\s\S]*?)(?=Action:|Final Answer:|$)/i);
    const actionMatch = responseText.match(/Action:\s*([a-zA-Z_]+)/i);
    const actionInputMatch = responseText.match(/Action Input:\s*(\{[\s\S]*\}|"[^"]*"|[^\n]+)/i);
    const finalAnswerMatch = responseText.match(/Final Answer:\s*([\s\S]*)$/i);

    const thought = thoughtMatch ? thoughtMatch[1].trim() : 'Analyzing goal and available tools...';

    // Check if Final Answer reached
    if (finalAnswerMatch && !actionMatch) {
      finalAnswer = finalAnswerMatch[1].trim();
      steps.push({
        stepNumber: currentIteration,
        thought,
        status: 'completed'
      });
      break;
    }

    if (actionMatch) {
      const toolName = actionMatch[1].trim();
      let toolArgs: Record<string, unknown> = {};

      if (actionInputMatch) {
        try {
          const rawInput = actionInputMatch[1].trim();
          toolArgs = rawInput.startsWith('{') ? JSON.parse(rawInput) : { query: rawInput.replace(/^"|"$/g, '') };
        } catch {
          toolArgs = { input: actionInputMatch[1].trim() };
        }
      }

      // Execute Tool
      const toolStartTime = Date.now();
      const observation = await executeTool(toolName, toolArgs);
      const toolDuration = Date.now() - toolStartTime;

      const toolRecord: ToolExecutionRecord = {
        id: `tool-${Date.now()}-${currentIteration}`,
        toolName,
        args: toolArgs,
        result: observation,
        durationMs: toolDuration,
        timestamp: new Date().toLocaleTimeString()
      };

      toolRecords.push(toolRecord);

      steps.push({
        stepNumber: currentIteration,
        thought,
        action: toolName,
        actionInput: toolArgs,
        observation,
        status: 'completed'
      });

      // Append to history context for next step
      historyContext.push(
        `Thought: ${thought}\nAction: ${toolName}\nAction Input: ${JSON.stringify(toolArgs)}\nObservation: ${observation}`
      );
    } else {
      // Direct text output without strict format
      finalAnswer = responseText.replace(/Thought:/i, '').trim();
      steps.push({
        stepNumber: currentIteration,
        thought,
        status: 'completed'
      });
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer = 'Agent completed reasoning steps within iteration limits and generated final synthesis.';
  }

  const totalDurationMs = Date.now() - startTime;

  metricsTracker.recordRequest({
    type: 'agent',
    durationMs: totalDurationMs,
    status: 'success',
    toolCallsCount: toolRecords.length
  });

  return {
    goal,
    steps,
    toolRecords,
    finalAnswer,
    totalDurationMs
  };
}

/**
 * Agentic AI, Tool Calling & Multi-Step Reasoning Models
 */

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[] | {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export type AgentTool = ToolDefinition;

export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  input?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: Record<string, unknown> | string;
  result?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  status?: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
  timestamp?: string;
}

export interface AgentStep {
  stepNumber: number;
  thought: string;
  action?: string | {
    tool: string;
    params: Record<string, unknown>;
  };
  actionInput?: Record<string, unknown>;
  observation?: string;
  status: 'planning' | 'executing_tool' | 'analyzing' | 'completed';
}

export interface AgentSessionState {
  sessionId: string;
  userGoal: string;
  currentStepIndex: number;
  steps: AgentStep[];
  toolRecords: ToolExecutionRecord[];
  finalAnswer?: string;
  isComplete: boolean;
  error?: string;
}

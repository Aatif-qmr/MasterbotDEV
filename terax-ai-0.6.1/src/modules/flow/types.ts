export type WorkflowNodeStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface WorkflowNode {
  id: string;
  label: string;
  agentId: string;
  task: string;
  status: WorkflowNodeStatus;
  output?: string;
  error?: string;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface Goal {
  id: string;
  description: string;
  targetState: Record<string, any>;
}

export interface Action {
  id: string;
  name: string;
  preconditions: Record<string, any>;
  effects: Record<string, any>;
  cost: number;
}

export type WorkflowTopology = 'linear' | 'parallel' | 'mesh' | 'star';

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  swarmId?: string;
  topology?: WorkflowTopology;
}

export interface FlowState {
  activeWorkflow: Workflow | null;
  isRunning: boolean;
}

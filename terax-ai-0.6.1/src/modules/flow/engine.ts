import { type Workflow, type WorkflowNode, type Goal, type Action } from './types';

/**
 * Basic GOAP-lite Planner
 */
export class Planner {
  constructor(private actions: Action[]) {}

  /**
   * Maps a Goal to a sequence of Actions using a simple forward search.
   */
  plan(goal: Goal, initialState: Record<string, any> = {}): Action[] {
    const plan: Action[] = [];
    let currentState = { ...initialState };
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      if (this.isGoalMet(goal, currentState)) {
        return plan;
      }

      // Find an action whose preconditions are met by current state
      const nextAction = this.actions.find(action => 
        Object.entries(action.preconditions).every(([key, value]) => 
          currentState[key] === value
        )
      );

      if (!nextAction) {
        break; // No more actions can be applied
      }

      plan.push(nextAction);
      currentState = { ...currentState, ...nextAction.effects };
    }

    return plan;
  }

  private isGoalMet(goal: Goal, state: Record<string, any>): boolean {
    return Object.entries(goal.targetState).every(([key, value]) => 
      state[key] === value
    );
  }
}

export class FlowEngine {
  private workflow: Workflow;
  private onNodeUpdate: (node: WorkflowNode) => void;
  private planner: Planner;
  private goal?: Goal;

  constructor(
    workflow: Workflow, 
    onNodeUpdate: (node: WorkflowNode) => void,
    goal?: Goal,
    availableActions: Action[] = []
  ) {
    this.workflow = workflow;
    this.onNodeUpdate = onNodeUpdate;
    this.goal = goal;
    this.planner = new Planner(availableActions);
  }

  /**
   * Handles replanning if a node fails.
   */
  private async handleReplanning(failedNode: WorkflowNode) {
    if (!this.goal) return;

    console.log(`Replanning due to failure in node: ${failedNode.id}`);
    
    // Determine current state based on completed nodes or environment
    // For this implementation, we use an empty state or derived state
    const currentState = {}; 
    const newActions = this.planner.plan(this.goal, currentState);
    
    if (newActions.length > 0) {
      console.log(`New plan generated with ${newActions.length} actions.`);
      // Integration of new actions into the workflow would happen here
    } else {
      console.warn('Planner could not find a new path to the goal.');
    }
  }

  async execute(): Promise<void> {
    const visited = new Set<string>();
    const completed = new Set<string>();

    const executeNode = async (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.workflow.nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Wait for dependencies
      const dependencies = this.workflow.edges
        .filter(e => e.target === nodeId)
        .map(e => e.source);
      
      for (const depId of dependencies) {
        while (!completed.has(depId)) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // Start execution
      node.status = 'running';
      this.onNodeUpdate(node);

      try {
        // Mock delay for execution
        await new Promise(r => setTimeout(r, 1000));
        
        // Simulating potential execution logic
        node.status = 'completed';
        node.output = `Output for task: ${node.task}`;
      } catch (e) {
        node.status = 'failed';
        node.error = e instanceof Error ? e.message : String(e);
        
        // Trigger replanning logic
        await this.handleReplanning(node);
      }

      this.onNodeUpdate(node);
      completed.add(nodeId);
    };

    // Find root nodes (no incoming edges)
    const rootNodes = this.workflow.nodes.filter(n => 
      !this.workflow.edges.some(e => e.target === n.id)
    );

    await Promise.all(rootNodes.map(n => executeNode(n.id)));
    
    // Trigger subsequent nodes
    let allDone = false;
    while (!allDone) {
      const nextNodes = this.workflow.nodes.filter(n => 
        !visited.has(n.id) && 
        this.workflow.edges.filter(e => e.target === n.id).every(e => completed.has(e.source))
      );
      
      if (nextNodes.length === 0) {
        allDone = visited.size === this.workflow.nodes.length;
        if (!allDone) await new Promise(r => setTimeout(r, 100));
        continue;
      }

      await Promise.all(nextNodes.map(n => executeNode(n.id)));
    }
  }
}

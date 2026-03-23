import { Lead } from '../supabase';

interface ReactFlowNode {
  id: string;
  type: string;
  data: any;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface EvaluatedAction {
  type: 'send_template' | 'close' | 'no_match';
  templateName?: string;
}

/**
 * Traverses a React Flow JSON graph (nodes and edges) perfectly matching
 * a given lead against the conditional paths to return the terminal Action node.
 */
export function evaluateWorkflowGraph(
  triggerState: string,
  lead: Lead,
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): EvaluatedAction {
  // 1. Find the Trigger Node that matches the current state
  const triggerNode = nodes.find(
    (n) => n.type === 'triggerNode' && n.data?.label?.includes(`State: ${triggerState}`)
  );

  if (!triggerNode) {
    return { type: 'no_match' };
  }

  return stepGraph(triggerNode.id, lead, nodes, edges);
}

function stepGraph(
  currentNodeId: string,
  lead: Lead,
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): EvaluatedAction {
  const currentNode = nodes.find((n) => n.id === currentNodeId);
  if (!currentNode) return { type: 'no_match' };

  if (currentNode.type === 'actionNode') {
    // Looks like "Send Template: wa_welcome_meta"
    const label = currentNode.data?.label || '';
    if (label.includes('Send Template:')) {
      const parts = label.split(':');
      const templateName = parts[1]?.trim() || '';
      return { type: 'send_template', templateName };
    }
  }

  if (currentNode.type === 'endNode') {
    return { type: 'close' };
  }

  if (currentNode.type === 'triggerNode' || currentNode.type === 'conditionNode') {
    // Find outgoing edges
    const outgoingEdges = edges.filter((e) => e.source === currentNode.id);

    if (outgoingEdges.length === 0) return { type: 'no_match' };

    // Standard routing: If it's a trigger, there's usually 1 outgoing edge
    if (currentNode.type === 'triggerNode') {
      return stepGraph(outgoingEdges[0].target, lead, nodes, edges);
    }

    // Condition routing: true/false handles
    if (currentNode.type === 'conditionNode') {
      const conditionStr = currentNode.data?.label || '';
      let isTrue = false;

      // Evaluate logic (Simple parser for Phase 1 MVP based on Source)
      if (conditionStr.toLowerCase().includes('source == meta ads')) {
        isTrue = lead.lead_source?.toLowerCase().includes('meta') ? true : false;
      }
      
      const targetEdge = outgoingEdges.find((e) => e.sourceHandle === (isTrue ? 'true' : 'false'));
      if (targetEdge) {
        return stepGraph(targetEdge.target, lead, nodes, edges);
      }
    }
  }

  return { type: 'no_match' };
}

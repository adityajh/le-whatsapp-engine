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
  // Check structured data.state first, then fallback to label parsing
  const triggerNode = nodes.find(
    (n) => n.type === 'triggerNode' && (
      n.data?.state === triggerState || 
      n.data?.label?.includes(`State: ${triggerState}`)
    )
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
    // Check structured data.templateName first
    const templateName = currentNode.data?.templateName || '';
    if (templateName) {
      return { type: 'send_template', templateName };
    }

    // Fallback: Label looks like "Send Template: wa_welcome_meta"
    const label = currentNode.data?.label || '';
    if (label.includes('Send Template:')) {
      const parts = label.split(':');
      const extractedTemplate = parts[1]?.trim() || '';
      return { type: 'send_template', templateName: extractedTemplate };
    }
  }

  if (currentNode.type === 'endNode') {
    return { type: 'close' };
  }

  if (currentNode.type === 'triggerNode' || currentNode.type === 'conditionNode') {
    const outgoingEdges = edges.filter((e) => e.source === currentNode.id);
    if (outgoingEdges.length === 0) return { type: 'no_match' };

    if (currentNode.type === 'triggerNode') {
      return stepGraph(outgoingEdges[0].target, lead, nodes, edges);
    }

    if (currentNode.type === 'conditionNode') {
      let isTrue = false;
      const { field, value, label } = currentNode.data || {};

      // Structured evaluation
      if (field && value) {
        const leadValue = (lead as any)[field];
        isTrue = String(leadValue).toLowerCase().includes(String(value).toLowerCase());
      } else {
        // Fallback: Label parsing (Simple parser for Phase 1 MVP based on Source)
        const conditionStr = label || '';
        if (conditionStr.toLowerCase().includes('source == meta ads')) {
          isTrue = lead.lead_source?.toLowerCase().includes('meta') ? true : false;
        }
      }
      
      const targetEdge = outgoingEdges.find((e) => e.sourceHandle === (isTrue ? 'true' : 'false'));
      if (targetEdge) {
        return stepGraph(targetEdge.target, lead, nodes, edges);
      }
    }
  }

  return { type: 'no_match' };
}


'use client';

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode, ConditionNode, ActionNode, EndNode } from './Nodes';

const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  endNode: EndNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    position: { x: 250, y: 50 },
    data: { label: 'State: wa_pending' },
  },
  {
    id: '2',
    type: 'conditionNode',
    position: { x: 250, y: 200 },
    data: { label: 'Source == Meta Ads?' },
  },
  {
    id: '3',
    type: 'actionNode',
    position: { x: 100, y: 350 },
    data: { label: 'Send Template: wa_welcome_meta' },
  },
  {
    id: '4',
    type: 'actionNode',
    position: { x: 400, y: 350 },
    data: { label: 'Send Template: wa_welcome_organic' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true', label: 'Yes' },
  { id: 'e2-4', source: '2', target: '4', sourceHandle: 'false', label: 'No' },
];

export default function LogicBuilderCanvas() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) {
        throw new Error('Failed to save workflow');
      }
      alert('Workflow rules published successfully to database!');
    } catch (error) {
      console.error(error);
      alert('Failed to save workflow. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="bg-white border-b py-3 px-6 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold font-sans">Visual Logic Builder</h1>
          <p className="text-xs text-gray-500">Drag nodes to build your WhatsApp flow rules</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save & Publish'}
        </button>
      </div>
      
      <div className="flex-1 bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <Panel position="top-left" className="bg-white p-3 rounded shadow-md border m-4 flex gap-2">
            <div className="text-sm font-semibold mb-1 w-full text-center">Add Node</div>
            <button className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded border border-blue-200">Trigger</button>
            <button className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded border border-yellow-200">Condition</button>
            <button className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded border border-green-200">Action</button>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

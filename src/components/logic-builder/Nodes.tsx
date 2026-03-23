import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Settings, Zap, Play, CheckCircle } from 'lucide-react';

const nodeStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '200px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

export const TriggerNode = memo(({ data }: any) => {
  return (
    <div style={{ ...nodeStyle, borderTop: '4px solid #3b82f6' }}>
      <div className="flex items-center gap-2 mb-2">
        <Play size={16} className="text-blue-500" />
        <strong className="text-sm">Trigger</strong>
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
});
TriggerNode.displayName = 'TriggerNode';

export const ConditionNode = memo(({ data }: any) => {
  return (
    <div style={{ ...nodeStyle, borderTop: '4px solid #eab308' }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <Settings size={16} className="text-yellow-500" />
        <strong className="text-sm">Condition</strong>
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <div className="flex justify-between mt-2 pt-2 border-t text-xs">
        <span className="text-green-600">True</span>
        <span className="text-red-600">False</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="w-3 h-3 bg-green-500" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="w-3 h-3 bg-red-500" />
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

export const ActionNode = memo(({ data }: any) => {
  return (
    <div style={{ ...nodeStyle, borderTop: '4px solid #22c55e' }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} className="text-green-500" />
        <strong className="text-sm">Action</strong>
      </div>
      <div className="text-xs text-gray-500">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  );
});
ActionNode.displayName = 'ActionNode';

export const EndNode = memo(({ data }: any) => {
  return (
    <div style={{ ...nodeStyle, borderTop: '4px solid #6b7280' }}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-300" />
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle size={16} className="text-gray-500" />
        <strong className="text-sm">End / Stop</strong>
      </div>
      <div className="text-xs text-gray-500">{data.label || 'Workflow finishes'}</div>
    </div>
  );
});
EndNode.displayName = 'EndNode';

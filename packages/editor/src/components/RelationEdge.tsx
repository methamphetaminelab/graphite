'use client';

import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
interface RelationEdgeData extends Record<string, unknown> {
  relationType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  onDelete: () => void;
  onUpdate: (updates: Partial<{ type: 'one_to_one' | 'one_to_many' | 'many_to_many' }>) => void;
}

const RelationEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as RelationEdgeData | undefined;
  const { relationType, onDelete, onUpdate } = edgeData || {};

  const getRelationSymbol = (type: string | undefined) => {
    switch (type) {
      case 'one_to_one':
        return '1:1';
      case 'one_to_many':
        return '1:N';
      case 'many_to_many':
        return 'N:M';
      default:
        return '';
    }
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        strokeWidth={2}
        stroke="#3b82f6"
        fill="none"
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-gray-200">
            <select
              value={relationType || 'one_to_many'}
              onChange={(e) => onUpdate?.({ type: e.target.value as 'one_to_one' | 'one_to_many' | 'many_to_many' })}
              className="text-xs font-medium text-blue-600 bg-transparent border-none outline-none cursor-pointer"
              title="Change relation type"
            >
              <option value="one_to_one">1:1</option>
              <option value="one_to_many">1:N</option>
              <option value="many_to_many">N:M</option>
            </select>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Delete relation"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

RelationEdge.displayName = 'RelationEdge';

export default RelationEdge;

'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSchemaStore } from '@/store/schemaStore';
import { Schema, Table, createRelation } from '@graphite/core';
import TableNode from './TableNode';
import RelationEdge from './RelationEdge';
import { LayoutGrid, ZoomIn, ZoomOut, Maximize, GitBranch } from 'lucide-react';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationEdge: RelationEdge };

interface VisualEditorProps {
  onEditTable: (tableId: string) => void;
  onEditColumn: (tableId: string, columnId: string) => void;
  onAddColumn: (tableId: string) => void;
  onStartRelation: (tableId: string, columnId: string) => void;
  onDeleteRelation: (relationId: string) => void;
}

function VisualEditorInner({
  onEditTable,
  onEditColumn,
  onAddColumn,
  onStartRelation,
  onDeleteRelation,
}: VisualEditorProps) {
  const { schema, updateTablePosition, addRelation, removeRelation, viewMode, setViewMode } = useSchemaStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingColumnId, setConnectingColumnId] = useState<string | null>(null);

  // Sync nodes from schema
  useEffect(() => {
    const newNodes: Node[] = schema.tables.map((table: Table) => ({
      id: table.id,
      type: 'tableNode',
      position: table.position || { x: 0, y: 0 },
      data: {
        table,
        onEdit: onEditTable,
        onDelete: (tableId: string) => {
          useSchemaStore.getState().removeTable(tableId);
        },
        onAddColumn,
        onEditColumn,
        onDeleteColumn: (tableId: string, columnId: string) => {
          useSchemaStore.getState().removeColumn(tableId, columnId);
        },
        onStartRelation,
      },
    }));
    setNodes(newNodes as any);
  }, [schema.tables, onEditTable, onAddColumn, onEditColumn, onStartRelation, setNodes]);

  // Sync edges from schema
  useEffect(() => {
    const newEdges: Edge[] = schema.relations.map((relation) => ({
      id: relation.id,
      source: relation.sourceTableId,
      target: relation.targetTableId,
      sourceHandle: `${relation.sourceColumnId}-source`,
      targetHandle: `${relation.targetColumnId}-target`,
      type: 'relationEdge',
      data: {
        relationType: relation.type,
        onDelete: () => onDeleteRelation(relation.id),
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 12,
        height: 12,
        color: '#3b82f6',
      },
    }));
    setEdges(newEdges as any);
  }, [schema.relations, onDeleteRelation, setEdges]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateTablePosition(node.id, { x: node.position.x, y: node.position.y });
    },
    [updateTablePosition]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        const sourceColumnId = connection.sourceHandle.replace('-source', '');
        const targetColumnId = connection.targetHandle.replace('-target', '');
        
        const relation = createRelation(
          connection.source,
          sourceColumnId,
          connection.target,
          targetColumnId,
          'one_to_many'
        );
        addRelation(relation);
      }
      setConnectingNodeId(null);
      setConnectingColumnId(null);
    },
    [addRelation]
  );

  const onConnectStart = useCallback(
    (_: any, { nodeId, handleId }: { nodeId: string | null; handleId: string | null }) => {
      if (nodeId && handleId) {
        setConnectingNodeId(nodeId);
        setConnectingColumnId(handleId.replace('-source', ''));
      }
    },
    []
  );

  const onConnectEnd = useCallback(
    (_: any) => {
      setConnectingNodeId(null);
      setConnectingColumnId(null);
    },
    []
  );

  const handleAutoLayout = useCallback(() => {
    // Simple grid layout
    const tables = schema.tables;
    const cols = Math.ceil(Math.sqrt(tables.length));
    const spacing = 300;
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      updateTablePosition(table.id, {
        x: col * spacing + 50,
        y: row * spacing + 50,
      });
    });
    
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [schema.tables, updateTablePosition, fitView]);

  return (
    <div className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={['Backspace', 'Delete']}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[10, 10]}
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white border border-gray-200 rounded-lg shadow-lg"
        />
        
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleAutoLayout}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            title="Auto layout"
          >
            <LayoutGrid className="w-4 h-4" />
            Auto Layout
          </button>
          <button
            onClick={() => zoomIn()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoomOut()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => fitView({ padding: 0.2 })}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            title="Fit view"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </Panel>

        {connectingNodeId && (
          <Panel position="bottom-center">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">
              <GitBranch className="w-4 h-4 inline mr-1" />
              Drag to another column to create a relation
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export default function VisualEditor(props: VisualEditorProps) {
  return (
    <ReactFlowProvider>
      <VisualEditorInner {...props} />
    </ReactFlowProvider>
  );
}

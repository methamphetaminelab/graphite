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
import { useBoxSelection } from '../hooks/useBoxSelection';
import { computeLayout } from '../lib/layoutEngine';
import { LayoutGrid, ZoomIn, ZoomOut, Maximize, GitBranch } from 'lucide-react';

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationEdge: RelationEdge };

interface VisualEditorProps {
  onEditTable: (tableId: string) => void;
  onEditColumn: (tableId: string, columnId: string) => void;
  onAddColumn: (tableId: string) => void;
  onStartRelation: (tableId: string, columnId: string) => void;
  onDeleteRelation: (relationId: string) => void;
  onUpdateRelation: (relationId: string, updates: Partial<{ type: 'one_to_one' | 'one_to_many' | 'many_to_many' }>) => void;
}

function VisualEditorInner({
  onEditTable,
  onEditColumn,
  onAddColumn,
  onStartRelation,
  onDeleteRelation,
  onUpdateRelation,
}: VisualEditorProps) {
  const {
    schema,
    updateTablePosition,
    addRelation,
    removeRelation,
    viewMode,
    setViewMode,
    selectedNodeIds,
    selectNode,
    toggleNode,
    selectNodes,
    clearSelection,
    deleteSelectedNodes,
    showContextMenu,
    hideContextMenu,
    copySelectedNodes,
    pasteNodes,
    updateTablePositions,
    focusedTableId,
    focusTable,
    focusedTableIds,
    focusTables,
    collapsedTableIds,
  } = useSchemaStore();
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [connectingColumnId, setConnectingColumnId] = useState<string | null>(null);
  const justBoxSelectedRef = useRef(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const newNodes: Node[] = schema.tables.map((table: Table) => ({
      id: table.id,
      type: 'tableNode',
      position: table.position || { x: 0, y: 0 },
      data: {
        table,
        isSelected: selectedNodeIds.includes(table.id),
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
  }, [schema.tables, selectedNodeIds, onEditTable, onAddColumn, onEditColumn, onStartRelation, setNodes]);

  useEffect(() => {
    const newEdges: Edge[] = schema.relations.map((relation) => {
      const sourceCollapsed = collapsedTableIds.includes(relation.sourceTableId);
      const targetCollapsed = collapsedTableIds.includes(relation.targetTableId);
      return {
        id: relation.id,
        source: relation.sourceTableId,
        target: relation.targetTableId,
        sourceHandle: sourceCollapsed ? 'header-source' : `${relation.sourceColumnId}-source`,
        targetHandle: targetCollapsed ? 'header-target' : `${relation.targetColumnId}-target`,
        type: 'relationEdge',
        data: {
          relationType: relation.type,
          onDelete: () => onDeleteRelation(relation.id),
          onUpdate: (updates: Partial<{ type: 'one_to_one' | 'one_to_many' | 'many_to_many' }>) => onUpdateRelation(relation.id, updates),
        },
        markerEnd: {
          type: 'arrowclosed',
          width: 12,
          height: 12,
          color: '#3b82f6',
        },
      };
    });
    setEdges(newEdges as any);
  }, [schema.relations, onDeleteRelation, onUpdateRelation, setEdges, collapsedTableIds]);

  useEffect(() => {
    if (focusedTableId) {
      const table = schema.tables.find((t) => t.id === focusedTableId);
      if (table?.position) {
        setTimeout(() => {
          fitView({
            nodes: [{ id: focusedTableId }],
            duration: 800,
            padding: 0.5,
          });
          selectNode(focusedTableId);
          focusTable(null);
        }, 50);
      }
    }
  }, [focusedTableId, schema.tables, fitView, selectNode, focusTable]);

  useEffect(() => {
    if (focusedTableIds.length > 0) {
      setTimeout(() => {
        fitView({
          nodes: focusedTableIds.map((id) => ({ id })),
          duration: 800,
          padding: 0.2,
        });
        focusTables([]);
      }, 50);
    }
  }, [focusedTableIds, fitView, focusTables]);

  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const state = useSchemaStore.getState();
      state.saveHistorySnapshot();
      const idsToMove = state.selectedNodeIds.includes(node.id)
        ? state.selectedNodeIds
        : [node.id];
      
      const positions = new Map<string, { x: number; y: number }>();
      idsToMove.forEach((id) => {
        const table = state.schema.tables.find((t) => t.id === id);
        if (table?.position) {
          positions.set(id, { ...table.position });
        }
      });
      dragStartPositionsRef.current = positions;
    },
    []
  );

  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const startPositions = dragStartPositionsRef.current;
      if (startPositions.size === 0) return;

      const startPos = startPositions.get(node.id);
      if (!startPos) return;

      const deltaX = node.position.x - startPos.x;
      const deltaY = node.position.y - startPos.y;

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const start = startPositions.get(n.id);
          if (!start) return n;
          return {
            ...n,
            position: {
              x: start.x + deltaX,
              y: start.y + deltaY,
            },
          };
        })
      );
    },
    [setNodes]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const startPositions = dragStartPositionsRef.current;
      if (startPositions.size === 0) {
        updateTablePosition(node.id, { x: node.position.x, y: node.position.y });
        return;
      }

      const startPos = startPositions.get(node.id);
      if (!startPos) {
        updateTablePosition(node.id, { x: node.position.x, y: node.position.y });
        return;
      }

      const deltaX = node.position.x - startPos.x;
      const deltaY = node.position.y - startPos.y;

      const updates: { tableId: string; position: { x: number; y: number } }[] = [];
      startPositions.forEach((start, id) => {
        updates.push({
          tableId: id,
          position: { x: start.x + deltaX, y: start.y + deltaY },
        });
      });

      updateTablePositions(updates);
      dragStartPositionsRef.current = new Map();
    },
    [updateTablePosition, updateTablePositions]
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
    const positions = computeLayout(schema.tables, schema.relations);
    positions.forEach((pos, tableId) => {
      updateTablePosition(tableId, pos);
    });
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 50);
  }, [schema.tables, schema.relations, updateTablePosition, fitView]);

  const {
    selectionBox,
    isSelecting,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useBoxSelection(
    (ids, multi) => {
      justBoxSelectedRef.current = true;
      if (multi) {
        const combined = [...new Set([...selectedNodeIds, ...ids])];
        selectNodes(combined);
      } else {
        selectNodes(ids);
      }
    },
    clearSelection
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          deleteSelectedNodes();
        }
      }
      if (e.key === 'Escape') {
        clearSelection();
        hideContextMenu();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        useSchemaStore.getState().selectAllNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        if (selectedNodeIds.length > 0) {
          useSchemaStore.getState().copySelectedNodes();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        useSchemaStore.getState().pasteNodes();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        useSchemaStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        useSchemaStore.getState().redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, deleteSelectedNodes, clearSelection, hideContextMenu]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${isSelecting ? 'cursor-crosshair' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        deleteKeyCode={null}
        selectionOnDrag={false}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[10, 10]}
        onNodeClick={(_event, node) => {
          const multi = _event.ctrlKey || _event.metaKey;
          if (multi) toggleNode(node.id);
          else selectNode(node.id);
        }}
        onPaneClick={() => {
          if (justBoxSelectedRef.current) {
            justBoxSelectedRef.current = false;
            return;
          }
          if (!isSelecting) {
            clearSelection();
            hideContextMenu();
          }
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          showContextMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y, type: 'node', nodeId: node.id });
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          showContextMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y, type: 'canvas' });
        }}
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

      {selectionBox && (
        <div
          className="absolute pointer-events-none bg-blue-500/20 border border-blue-500/50 z-10"
          style={(() => {
            const rect = containerRef.current?.getBoundingClientRect();
            const offsetX = rect?.left ?? 0;
            const offsetY = rect?.top ?? 0;
            const left = Math.min(selectionBox.start.x, selectionBox.end.x) - offsetX;
            const top = Math.min(selectionBox.start.y, selectionBox.end.y) - offsetY;
            const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
            const height = Math.abs(selectionBox.end.y - selectionBox.start.y);
            return { left, top, width, height };
          })()}
        />
      )}
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

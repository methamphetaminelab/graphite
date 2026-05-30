'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table, Column } from '@graphite/core';
import { useSchemaStore } from '@/store/schemaStore';
import { Pencil, Trash2, Plus, Key } from 'lucide-react';

interface TableNodeData extends Record<string, unknown> {
  table: Table;
  isSelected?: boolean;
  onEdit: (tableId: string) => void;
  onDelete: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
  onEditColumn: (tableId: string, columnId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onStartRelation: (tableId: string, columnId: string) => void;
}

const TableNode = memo(({ data, selected, id }: NodeProps) => {
  const nodeData = data as TableNodeData;
  const { table, isSelected, onEdit, onDelete, onAddColumn, onEditColumn, onDeleteColumn, onStartRelation } = nodeData;
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const { toggleNode, selectNode, collapsedTableIds, toggleTableCollapse } = useSchemaStore();
  const isExpanded = !collapsedTableIds.includes(table.id);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(table.id);
  }, [onEdit, table.id]);
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(table.id);
  }, [onDelete, table.id]);
  const handleAddColumn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddColumn(table.id);
  }, [onAddColumn, table.id]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      toggleNode(id);
    }
  }, [id, toggleNode]);

  return (
    <div 
      onClick={handleNodeClick}
      className={`
      bg-white border-2 rounded-lg shadow-lg min-w-[240px] transition-all
      ${isSelected || selected ? 'ring-2 ring-blue-500 border-blue-500 shadow-blue-200' : table.color ? '' : 'border-gray-200'}
    `}
      style={!isSelected && !selected && table.color ? { borderColor: table.color } : undefined}>
      
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg relative">
        <Handle
          type="target"
          position={Position.Left}
          id="header-target"
          className="!w-2 !h-2 !bg-blue-500 !border-2 !border-white"
          style={{ top: '50%', left: '-6px' }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTableCollapse(table.id);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="font-semibold text-sm text-gray-800">{table.name}</span>
          {table.schema && (
            <span className="text-xs text-gray-500">({table.schema})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleEdit}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit table"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete table"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="header-source"
          className="!w-2 !h-2 !bg-blue-500 !border-2 !border-white"
          style={{ top: '50%', right: '-6px' }}
        />
      </div>

      {isExpanded && (
        <div className="py-1">
          {table.columns.map((column: Column) => (
            <div
              key={column.id}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 group relative"
              onMouseEnter={() => setHoveredColumn(column.id)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {column.primaryKey && (
                  <Key className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                )}
                {!column.primaryKey && (
                  <div className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 truncate">{column.name}</span>
                <span className="text-xs text-gray-400 truncate">{column.type}</span>
                {column.nullable && (
                  <span className="text-xs text-gray-400">?</span>
                )}
              </div>
              
              {hoveredColumn === column.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditColumn(table.id, column.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit column"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteColumn(table.id, column.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete column"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <Handle
                type="target"
                position={Position.Left}
                id={`${column.id}-target`}
                className="!w-2 !h-2 !bg-blue-500 !border-2 !border-white"
                style={{ top: '50%' }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}-source`}
                className="!w-2 !h-2 !bg-blue-500 !border-2 !border-white"
                style={{ top: '50%' }}
              />
            </div>
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddColumn(e);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 w-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add column
          </button>
        </div>
      )}
    </div>
  );
});

TableNode.displayName = 'TableNode';

export default TableNode;

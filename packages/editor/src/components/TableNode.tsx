'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Table, Column } from '@graphite/core';
import { useSchemaStore } from '@/store/schemaStore';
import { Pencil, Trash2, Plus, Key, Link2 } from 'lucide-react';

interface TableNodeData extends Record<string, unknown> {
  table: Table;
  onEdit: (tableId: string) => void;
  onDelete: (tableId: string) => void;
  onAddColumn: (tableId: string) => void;
  onEditColumn: (tableId: string, columnId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onStartRelation: (tableId: string, columnId: string) => void;
}

const TableNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TableNodeData;
  const { table, onEdit, onDelete, onAddColumn, onEditColumn, onDeleteColumn, onStartRelation } = nodeData;
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const handleEdit = useCallback(() => onEdit(table.id), [onEdit, table.id]);
  const handleDelete = useCallback(() => onDelete(table.id), [onDelete, table.id]);
  const handleAddColumn = useCallback(() => onAddColumn(table.id), [onAddColumn, table.id]);

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-[240px] transition-all ${
      selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
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
      </div>

      {/* Columns */}
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
                    onClick={() => onStartRelation(table.id, column.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Create relation"
                  >
                    <Link2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onEditColumn(table.id, column.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Edit column"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteColumn(table.id, column.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete column"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Handles for relations */}
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
          
          {/* Add column button */}
          <button
            onClick={handleAddColumn}
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

'use client';

import React, { useState } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { DatabaseDialect, createTable, createColumn, createEnum } from '@graphite/core';
import { Plus, Settings, Database, ChevronDown, ChevronRight, Trash2, Edit3 } from 'lucide-react';

interface SidebarProps {
  onEditTable: (tableId: string) => void;
  onEditColumn: (tableId: string, columnId: string) => void;
  onAddColumn: (tableId: string) => void;
}

export default function Sidebar({ onEditTable, onEditColumn, onAddColumn }: SidebarProps) {
  const { schema, setDialect, addTable, removeTable } = useSchemaStore();
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedEnums, setExpandedEnums] = useState<Set<string>>(new Set());

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const toggleEnum = (enumId: string) => {
    setExpandedEnums((prev) => {
      const next = new Set(prev);
      if (next.has(enumId)) {
        next.delete(enumId);
      } else {
        next.add(enumId);
      }
      return next;
    });
  };

  const handleAddTable = () => {
    addTable('new_table');
    
  };

  const handleAddEnum = () => {
    
    alert('Enum support coming soon!');
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Database</span>
        </div>
        <select
          value={schema.dialect}
          onChange={(e) => setDialect(e.target.value as DatabaseDialect)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="sqlite">SQLite</option>
          <option value="mssql">SQL Server</option>
          <option value="oracle">Oracle</option>
          <option value="mariadb">MariaDB</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tables</span>
          <button
            onClick={handleAddTable}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Add table"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="px-2">
          {schema.tables.map((table) => (
            <div key={table.id} className="mb-1">
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer group"
                onClick={() => toggleTable(table.id)}
              >
                {expandedTables.has(table.id) ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span className="text-sm text-gray-700 flex-1">{table.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTable(table.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTable(table.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {expandedTables.has(table.id) && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {table.columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 group cursor-pointer"
                      onClick={() => onEditColumn(table.id, column.id)}
                    >
                      <span className="text-xs text-gray-600 flex-1">{column.name}</span>
                      <span className="text-xs text-gray-400">{column.type}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => onAddColumn(table.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add column
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {schema.enums.length > 0 && (
          <>
            <div className="px-4 py-2 flex items-center justify-between mt-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enums</span>
              <button
                onClick={handleAddEnum}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Add enum"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="px-2">
              {schema.enums.map((enumType) => (
                <div key={enumType.id} className="mb-1">
                  <div
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer group"
                    onClick={() => toggleEnum(enumType.id)}
                  >
                    {expandedEnums.has(enumType.id) ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-700 flex-1">{enumType.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {expandedEnums.has(enumType.id) && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {enumType.values.map((value) => (
                        <div key={value} className="px-2 py-1 text-xs text-gray-600">
                          {value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Tables:</span>
            <span className="font-medium">{schema.tables.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Columns:</span>
            <span className="font-medium">
              {schema.tables.reduce((acc, t) => acc + t.columns.length, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Relations:</span>
            <span className="font-medium">{schema.relations.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Enums:</span>
            <span className="font-medium">{schema.enums.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

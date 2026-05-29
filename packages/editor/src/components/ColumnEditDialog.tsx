'use client';

import React, { useState, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { Column, DatabaseDialect } from '@graphite/core';
import { X } from 'lucide-react';

interface ColumnEditDialogProps {
  tableId: string;
  columnId?: string;
  onClose: () => void;
}

export default function ColumnEditDialog({ tableId, columnId, onClose }: ColumnEditDialogProps) {
  const { schema, updateColumn, addColumn } = useSchemaStore();
  const table = schema.tables.find((t) => t.id === tableId);
  const existingColumn = columnId ? table?.columns.find((c) => c.id === columnId) : undefined;
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [primaryKey, setPrimaryKey] = useState(false);
  const [unique, setUnique] = useState(false);
  const [nullable, setNullable] = useState(true);
  const [autoIncrement, setAutoIncrement] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (existingColumn) {
      setName(existingColumn.name);
      setType(existingColumn.type);
      setPrimaryKey(existingColumn.primaryKey || false);
      setUnique(existingColumn.unique || false);
      setNullable(existingColumn.nullable ?? true);
      setAutoIncrement(existingColumn.autoIncrement || false);
      setDefaultValue(existingColumn.defaultValue || '');
      setNote(existingColumn.note || '');
    } else {
      // Default values for new column
      setName('');
      setType('');
      setPrimaryKey(false);
      setUnique(false);
      setNullable(true);
      setAutoIncrement(false);
      setDefaultValue('');
      setNote('');
    }
  }, [existingColumn]);

  if (!table) return null;

  const handleSave = () => {
    const columnData: Partial<Column> = {
      name,
      type,
      primaryKey,
      unique,
      nullable,
      autoIncrement,
      defaultValue: defaultValue || undefined,
      note: note || undefined,
    };

    if (existingColumn) {
      updateColumn(tableId, columnId!, columnData);
    } else {
      addColumn(tableId, {
        ...columnData,
        id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      } as Column);
    }
    onClose();
  };

  const getTypeSuggestions = (): string[] => {
    const commonTypes: Record<DatabaseDialect, string[]> = {
      postgresql: ['serial', 'bigserial', 'integer', 'bigint', 'varchar', 'text', 'boolean', 'timestamp', 'date', 'decimal', 'numeric', 'uuid', 'json', 'jsonb'],
      mysql: ['int', 'bigint', 'varchar', 'text', 'boolean', 'datetime', 'date', 'decimal', 'float', 'double', 'json', 'blob'],
      sqlite: ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'],
      mssql: ['int', 'bigint', 'nvarchar', 'varchar', 'text', 'bit', 'datetime', 'date', 'decimal', 'float', 'uniqueidentifier', 'varbinary'],
      oracle: ['NUMBER', 'VARCHAR2', 'NVARCHAR2', 'CLOB', 'BLOB', 'DATE', 'TIMESTAMP', 'RAW', 'CHAR'],
      mariadb: ['int', 'bigint', 'varchar', 'text', 'boolean', 'datetime', 'date', 'decimal', 'float', 'double', 'json', 'blob'],
    };

    return commonTypes[schema.dialect] || commonTypes.postgresql;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {existingColumn ? 'Edit Column' : 'Add Column'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              list="type-suggestions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., varchar(255)"
            />
            <datalist id="type-suggestions">
              {getTypeSuggestions().map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* Constraints */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Constraints</label>
            
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={primaryKey}
                  onChange={(e) => setPrimaryKey(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Primary Key</span>
              </label>

              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unique}
                  onChange={(e) => setUnique(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Unique</span>
              </label>

              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!nullable}
                  onChange={(e) => setNullable(!e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Not Null</span>
              </label>

              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoIncrement}
                  onChange={(e) => setAutoIncrement(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Auto Increment</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Value (optional)</label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., CURRENT_TIMESTAMP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
              placeholder="Add a note about this column..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !type.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingColumn ? 'Save Changes' : 'Add Column'}
          </button>
        </div>
      </div>
    </div>
  );
}

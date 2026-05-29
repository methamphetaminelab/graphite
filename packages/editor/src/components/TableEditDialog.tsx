'use client';

import React, { useState, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { X, Plus, Trash2 } from 'lucide-react';

interface TableEditDialogProps {
  tableId: string;
  onClose: () => void;
}

export default function TableEditDialog({ tableId, onClose }: TableEditDialogProps) {
  const { schema, updateTable } = useSchemaStore();
  const table = schema.tables.find((t) => t.id === tableId);
  
  const [name, setName] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [note, setNote] = useState('');
  const [indexes, setIndexes] = useState<{ name: string; columns: string; unique: boolean }[]>([]);

  useEffect(() => {
    if (table) {
      setName(table.name);
      setSchemaName(table.schema || '');
      setNote(table.note || '');
      setIndexes(table.indexes?.map((idx) => ({
        name: idx.name,
        columns: idx.columns.join(', '),
        unique: idx.unique || false,
      })) || []);
    }
  }, [table]);

  if (!table) return null;

  const handleSave = () => {
    updateTable(tableId, {
      name,
      schema: schemaName || undefined,
      note: note || undefined,
      indexes: indexes.map((idx) => ({
        id: `idx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: idx.name,
        columns: idx.columns.split(',').map((c) => c.trim()).filter(Boolean),
        unique: idx.unique,
        type: 'btree' as const,
      })),
    });
    onClose();
  };

  const addIndex = () => {
    setIndexes([...indexes, { name: '', columns: '', unique: false }]);
  };

  const removeIndex = (index: number) => {
    setIndexes(indexes.filter((_, i) => i !== index));
  };

  const updateIndex = (index: number, field: string, value: string | boolean) => {
    setIndexes(indexes.map((idx, i) => i === index ? { ...idx, [field]: value } : idx));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Edit Table</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., users"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schema (optional)</label>
            <input
              type="text"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., public"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
              placeholder="Add a note about this table..."
            />
          </div>

          {/* Indexes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Indexes</label>
              <button
                onClick={addIndex}
                className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Index
              </button>
            </div>
            
            {indexes.map((idx, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={idx.name}
                  onChange={(e) => updateIndex(index, 'name', e.target.value)}
                  placeholder="Index name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  value={idx.columns}
                  onChange={(e) => updateIndex(index, 'columns', e.target.value)}
                  placeholder="col1, col2"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={idx.unique}
                    onChange={(e) => updateIndex(index, 'unique', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Unique
                </label>
                <button
                  onClick={() => removeIndex(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

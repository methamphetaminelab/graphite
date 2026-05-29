'use client';

import React, { useState } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { generateSQL, generateDbml, schemaToJson } from '@graphite/core';
import { 
  Download, 
  Upload, 
  Eye,
  Code,
  Plus
} from 'lucide-react';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';

export default function Toolbar() {
  const { schema, viewMode, setViewMode, addTable } = useSchemaStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleAddTable = () => {
    addTable('new_table');
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800">Graphite</h1>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {schema.dialect}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                viewMode === 'visual'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              Visual
            </button>
            <button
              onClick={() => setViewMode('dsl')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                viewMode === 'dsl'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Code className="w-4 h-4" />
              DBML
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddTable}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Table
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </>
  );
}

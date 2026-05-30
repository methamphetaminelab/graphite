'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { parseDbml, deserializeSchema, parseSQL } from '@graphite/core';
import { computeLayout } from '../lib/layoutEngine';
import { X, Upload, FileJson, FileCode, Database, AlertCircle, Check } from 'lucide-react';

type ImportFormat = 'dbml' | 'json' | 'sql';

interface ImportDialogProps {
  onClose: () => void;
}

export default function ImportDialog({ onClose }: ImportDialogProps) {
  const { setSchema, focusTables } = useSchemaStore();
  const [format, setFormat] = useState<ImportFormat>('dbml');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string);
      setError(null);
      setSuccess(false);
    };
    reader.readAsText(file);
  };

  const assignPositions = (schema: any) => {
    if (schema.tables.some((t: any) => !t.position)) {
      const positions = computeLayout(schema.tables, schema.relations);
      schema.tables = schema.tables.map((t: any) => ({
        ...t,
        position: positions.get(t.id) || { x: 0, y: 0 },
      }));
    }
    return schema;
  };

  const handleImport = () => {
    try {
      setError(null);
      
      switch (format) {
        case 'dbml': {
          
          if (!content.trim() || !/Table\s+\w+\s*\{/.test(content)) {
            throw new Error(
              'Invalid DBML format. Expected DBML syntax like:\n\n' +
              'Table users {\n' +
              '  id int [pk]\n' +
              '  name varchar\n' +
              '}\n\n' +
              'Note: SQL DDL files (CREATE TABLE) are not DBML. Use JSON format or connect to a live database instead.'
            );
          }
          const schema = assignPositions(parseDbml(content));
          setSchema(schema);
          if (schema.tables.length > 0) {
            focusTables(schema.tables.map((t: any) => t.id));
          }
          break;
        }
        case 'json': {
          
          const trimmed = content.trim();
          if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
            throw new Error(
              'Invalid JSON format. Content must start with { or [.\n\n' +
              'If you are importing a SQL dump file, please note that SQL DDL import is not yet supported. ' +
              'Use DBML format or connect to a live database instead.'
            );
          }
          
          const schema = assignPositions(deserializeSchema(content));
          setSchema(schema);
          if (schema.tables.length > 0) {
            focusTables(schema.tables.map((t: any) => t.id));
          }
          break;
        }
        case 'sql': {
          
          if (!content.trim() || !/CREATE\s+TABLE/i.test(content)) {
            throw new Error(
              'Invalid SQL format. Expected SQL DDL with CREATE TABLE statements.\n\n' +
              'Example:\n' +
              'CREATE TABLE users (\n' +
              '  id INT PRIMARY KEY,\n' +
              '  name VARCHAR(255)\n' +
              ');'
            );
          }
          const schema = assignPositions(parseSQL(content));
          setSchema(schema);
          if (schema.tables.length > 0) {
            focusTables(schema.tables.map((t: any) => t.id));
          }
          break;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import schema');
      setSuccess(false);
    }
  };

  const formats: { value: ImportFormat; label: string; icon: React.ReactNode; extensions: string }[] = [
    { value: 'dbml', label: 'DBML', icon: <FileCode className="w-4 h-4" />, extensions: '.dbml,.txt' },
    { value: 'json', label: 'JSON', icon: <FileJson className="w-4 h-4" />, extensions: '.json' },
    { value: 'sql', label: 'SQL DDL', icon: <Database className="w-4 h-4" />, extensions: '.sql' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Import Schema</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setFormat(f.value);
                  setError(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  format === f.value
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Paste content or upload a file
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={formats.find((f) => f.value === format)?.extensions}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            placeholder={`Paste your ${format.toUpperCase()} content here...`}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
        
        {success && (
          <div className="px-6 py-3 bg-green-50 border-t border-green-200">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Check className="w-4 h-4" />
              Schema imported successfully!
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!content.trim() || success}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

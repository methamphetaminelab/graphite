'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { generateDbml, parseDbml } from '@graphite/core';
import { AlertCircle, Check } from 'lucide-react';

export default function DslEditor() {
  const { schema, setSchema } = useSchemaStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Generate DBML from schema
  useEffect(() => {
    try {
      const dbmlCode = generateDbml(schema);
      setCode(dbmlCode);
      setError(null);
      setIsValid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate DBML');
      setIsValid(false);
    }
  }, [schema]);

  // Debounced parse DBML to schema
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const newSchema = parseDbml(code);
        // Preserve positions from current schema
        const mergedSchema = {
          ...newSchema,
          tables: newSchema.tables.map((table) => {
            const existingTable = schema.tables.find((t) => t.id === table.id);
            return existingTable ? { ...table, position: existingTable.position } : table;
          }),
        };
        setSchema(mergedSchema);
        setError(null);
        setIsValid(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid DBML');
        setIsValid(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, setSchema, schema.tables]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">DBML Editor</span>
          {isValid ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3.5 h-3.5" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              Invalid
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Changes are synced with the visual editor
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <textarea
          value={code}
          onChange={handleChange}
          className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

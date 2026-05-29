'use client';

import React, { useState } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { generateSQL, generateDbml, schemaToJson } from '@graphite/core';
import { X, Copy, Check, Download, FileJson, FileCode, Database, Image, FileText } from 'lucide-react';

type ExportFormat = 'sql' | 'dbml' | 'json' | 'png' | 'svg' | 'pdf';

interface ExportDialogProps {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const { schema } = useSchemaStore();
  const [format, setFormat] = useState<ExportFormat>('sql');
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState('');

  const generateContent = () => {
    try {
      switch (format) {
        case 'sql':
          return generateSQL(schema, schema.dialect);
        case 'dbml':
          return generateDbml(schema);
        case 'json':
          return JSON.stringify(schemaToJson(schema), null, 2);
        default:
          return '';
      }
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  };

  React.useEffect(() => {
    if (format === 'sql' || format === 'dbml' || format === 'json') {
      setContent(generateContent());
    }
  }, [format, schema]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    let blob: Blob;
    let filename: string;

    switch (format) {
      case 'sql':
        blob = new Blob([content], { type: 'text/plain' });
        filename = `${schema.name || 'schema'}.sql`;
        break;
      case 'dbml':
        blob = new Blob([content], { type: 'text/plain' });
        filename = `${schema.name || 'schema'}.dbml`;
        break;
      case 'json':
        blob = new Blob([content], { type: 'application/json' });
        filename = `${schema.name || 'schema'}.json`;
        break;
      case 'png':
      case 'svg':
      case 'pdf':
        // These would be handled by the visual editor's export function
        alert('Image export is available from the visual editor canvas');
        return;
      default:
        return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formats: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: 'sql', label: 'SQL DDL', icon: <Database className="w-4 h-4" /> },
    { value: 'dbml', label: 'DBML', icon: <FileCode className="w-4 h-4" /> },
    { value: 'json', label: 'JSON', icon: <FileJson className="w-4 h-4" /> },
    { value: 'png', label: 'PNG Image', icon: <Image className="w-4 h-4" /> },
    { value: 'svg', label: 'SVG Vector', icon: <FileText className="w-4 h-4" /> },
    { value: 'pdf', label: 'PDF Document', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Export Schema</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
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

        {/* Content Preview */}
        {format === 'sql' || format === 'dbml' || format === 'json' ? (
          <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Preview</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <pre className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto text-sm font-mono text-gray-700">
              {content}
            </pre>
          </div>
        ) : (
          <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center text-center">
            <Image className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-600 mb-2">Image export is available from the visual editor</p>
            <p className="text-sm text-gray-500">
              Switch to Visual view and use the canvas export options
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

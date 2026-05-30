'use client';

import React, { useState, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { generateSQL, generateDbml, schemaToJson } from '@graphite/core';
import { X, Copy, Check, Download, FileJson, FileCode, Database, Image as ImageIcon, FileText } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';

type ExportFormat = 'sql' | 'dbml' | 'json';

interface ExportDialogProps {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const { schema, selectedNodeIds } = useSchemaStore();
  const [format, setFormat] = useState<ExportFormat>('sql');
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState('');
  const [exportSelectedOnly, setExportSelectedOnly] = useState(false);

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
    setContent(generateContent());
  }, [format, schema]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
  ];

  async function exportImage(format: 'png' | 'svg') {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;

    let dataUrl: string;

    if (exportSelectedOnly && selectedNodeIds.length > 0) {
      const nodes = schema.tables
        .filter(t => selectedNodeIds.includes(t.id))
        .map(t => ({
          id: t.id,
          position: t.position ?? { x: 0, y: 0 },
          width: 200,
          height: 60 + t.columns.length * 24,
        }));

      const bounds = nodes.reduce(
        (acc, n) => ({
          x: Math.min(acc.x, n.position.x),
          y: Math.min(acc.y, n.position.y),
          right: Math.max(acc.right, n.position.x + n.width),
          bottom: Math.max(acc.bottom, n.position.y + n.height),
        }),
        { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity }
      );

      const width = bounds.right - bounds.x + 40;
      const height = bounds.bottom - bounds.y + 40;
      const style = { transform: `translate(${-bounds.x + 20}px, ${-bounds.y + 20}px)` };

      dataUrl = format === 'png'
        ? await toPng(element, { width, height, style })
        : await toSvg(element, { width, height, style });
    } else {
      dataUrl = format === 'png'
        ? await toPng(element)
        : await toSvg(element);
    }

    const link = document.createElement('a');
    link.download = `schema-export.${format}`;
    link.href = dataUrl;
    link.click();
  }

  async function exportPDF() {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;

    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgProps = pdf.getImageProperties(dataUrl);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.setProperties({
      title: schema.name,
      subject: 'Database Schema',
      creator: 'Graphite Editor',
    });
    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      10,
      pdf.internal.pageSize.getHeight() - 10
    );

    pdf.save(`${schema.name}-schema.pdf`);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[800px] max-h-[80vh] flex flex-col">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Export Schema</h2>
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

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="export-selected"
              checked={exportSelectedOnly}
              onChange={e => setExportSelectedOnly(e.target.checked)}
              disabled={selectedNodeIds.length === 0}
              className="rounded border-gray-300"
            />
            <label htmlFor="export-selected" className="text-sm text-gray-600">
              Export selected only {selectedNodeIds.length > 0 && `(${selectedNodeIds.length})`}
            </label>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => exportImage('png')} 
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              PNG
            </button>
            <button 
              onClick={() => exportImage('svg')} 
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              SVG
            </button>
            <button 
              onClick={exportPDF} 
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}

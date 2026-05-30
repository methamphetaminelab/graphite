'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import { ShieldCheck } from 'lucide-react';
import type { SchemaWithRelations, Table, Column, Relation } from '@graphite/core';

export interface VerificationIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'relation';
  message: string;
  tableId?: string;
  columnId?: string;
}

export function verifySchema(schema: SchemaWithRelations): VerificationIssue[] {
  const issues: VerificationIssue[] = [];

  const connectedTables = new Set<string>();
  schema.relations.forEach(r => {
    connectedTables.add(r.sourceTableId);
    connectedTables.add(r.targetTableId);
  });
  schema.tables.forEach(t => {
    if (!connectedTables.has(t.id)) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'relation',
        message: `Table "${t.name}" has no relations`,
        tableId: t.id,
      });
    }
  });

  schema.tables.forEach(t => {
    if (!t.columns.some(c => c.primaryKey)) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: `Table "${t.name}" has no primary key`,
        tableId: t.id,
      });
    }
  });

  const adj = new Map<string, string[]>();
  schema.tables.forEach(t => adj.set(t.id, []));
  schema.relations.forEach(r => {
    adj.get(r.sourceTableId)!.push(r.targetTableId);
  });
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'warning',
          message: `Circular relation detected involving "${node}"`,
          tableId: node,
        });
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }
  for (const node of adj.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
  schema.tables.forEach(t => {
    if (!snakeCaseRegex.test(t.name)) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'info',
        message: `Table name "${t.name}" should be snake_case`,
        tableId: t.id,
      });
    }
    t.columns.forEach(c => {
      if (!snakeCaseRegex.test(c.name)) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'info',
          message: `Column name "${c.name}" should be snake_case`,
          tableId: t.id,
          columnId: c.id,
        });
      }
    });
  });

  const reservedWords = new Set([
    'select', 'from', 'where', 'insert', 'update', 'delete',
    'table', 'column', 'index', 'drop', 'create', 'alter',
  ]);
  schema.tables.forEach(t => {
    t.columns.forEach(c => {
      if (reservedWords.has(c.name.toLowerCase())) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: `Column "${c.name}" is a reserved word`,
          tableId: t.id,
          columnId: c.id,
        });
      }
    });
  });

  const tableNames = new Map<string, string[]>();
  schema.tables.forEach(t => {
    if (!tableNames.has(t.name)) tableNames.set(t.name, []);
    tableNames.get(t.name)!.push(t.id);
  });
  tableNames.forEach((ids, name) => {
    if (ids.length > 1) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'error',
        message: `Duplicate table name "${name}"`,
        tableId: ids[0],
      });
    }
  });

  schema.tables.forEach(t => {
    const colNames = new Map<string, string[]>();
    t.columns.forEach(c => {
      if (!colNames.has(c.name)) colNames.set(c.name, []);
      colNames.get(c.name)!.push(c.id);
    });
    colNames.forEach((ids, name) => {
      if (ids.length > 1) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'error',
          message: `Duplicate column "${name}" in table "${t.name}"`,
          tableId: t.id,
          columnId: ids[0],
        });
      }
    });
  });

  return issues;
}

export function VerificationDialog({
  open,
  onClose,
  onGoTo,
}: {
  open: boolean;
  onClose: () => void;
  onGoTo: (tableId: string) => void;
}) {
  const { schema } = useSchemaStore();
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info' | 'relation'>('all');

  const issues = useMemo(() => verifySchema(schema), [schema]);
  const filtered = filter === 'all' ? issues : issues.filter(i => i.type === filter);

  const counts = {
    error: issues.filter(i => i.type === 'error').length,
    warning: issues.filter(i => i.type === 'warning').length,
    info: issues.filter(i => i.type === 'info').length,
    relation: issues.filter(i => i.type === 'relation').length,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Schema Verification</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-200">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({issues.length})
          </FilterButton>
          <FilterButton active={filter === 'error'} onClick={() => setFilter('error')} color="text-red-600">
            Errors ({counts.error})
          </FilterButton>
          <FilterButton active={filter === 'warning'} onClick={() => setFilter('warning')} color="text-yellow-600">
            Warnings ({counts.warning})
          </FilterButton>
          <FilterButton active={filter === 'info'} onClick={() => setFilter('info')} color="text-blue-600">
            Info ({counts.info})
          </FilterButton>
          <FilterButton active={filter === 'relation'} onClick={() => setFilter('relation')} color="text-purple-600">
            Relations ({counts.relation})
          </FilterButton>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filtered.map(issue => (
            <div
              key={issue.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <span className={`
                w-2 h-2 rounded-full mt-1.5 shrink-0
                ${issue.type === 'error' ? 'bg-red-500' : issue.type === 'warning' ? 'bg-yellow-500' : issue.type === 'relation' ? 'bg-purple-500' : 'bg-blue-500'}
              `} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{issue.message}</p>
              </div>
              {issue.tableId && (
                <button
                  onClick={() => onGoTo(issue.tableId!)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Go to
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <ShieldCheck className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-lg font-medium text-gray-700">No issues found</p>
              <p className="text-sm">Your schema looks good!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
  color = 'text-gray-600',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active ? 'bg-blue-50 text-blue-700 border border-blue-200' : `bg-gray-50 ${color} hover:bg-gray-100 border border-transparent`
      }`}
    >
      {children}
    </button>
  );
}


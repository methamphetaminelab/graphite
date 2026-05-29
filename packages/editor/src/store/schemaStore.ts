import { create } from 'zustand';
import type { SchemaWithRelations, Table, Column, Relation, DatabaseDialect } from '@graphite/core';
import { createEmptySchema, createTable, createColumn, createRelation } from '@graphite/core';

interface SchemaState {
  schema: SchemaWithRelations;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  viewMode: 'visual' | 'dsl' | 'split';
  
  setSchema: (schema: SchemaWithRelations) => void;
  setDialect: (dialect: DatabaseDialect) => void;
  addTable: (name: string, schema?: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  removeTable: (tableId: string) => void;
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  addRelation: (relation: Relation) => void;
  removeRelation: (relationId: string) => void;
  setSelectedTable: (tableId: string | null) => void;
  setSelectedColumn: (columnId: string | null) => void;
  setViewMode: (mode: 'visual' | 'dsl' | 'split') => void;
  updateTablePosition: (tableId: string, position: { x: number; y: number }) => void;
}

export const useSchemaStore = create<SchemaState>((set) => ({
  schema: createEmptySchema('postgresql'),
  selectedTableId: null,
  selectedColumnId: null,
  viewMode: 'visual',

  setSchema: (schema) => set({ schema }),
  
  setDialect: (dialect) => set((state) => ({
    schema: { ...state.schema, dialect },
  })),

  addTable: (name, schemaName) => set((state) => {
    const table = createTable(name, schemaName);
    table.columns.push(createColumn('id', 'integer'));
    table.columns[0].primaryKey = true;
    table.columns[0].nullable = false;
    return {
      schema: {
        ...state.schema,
        tables: [...state.schema.tables, table],
      },
      selectedTableId: table.id,
    };
  }),

  updateTable: (tableId, updates) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.map((t) =>
        t.id === tableId ? { ...t, ...updates } : t
      ),
    },
  })),

  removeTable: (tableId) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.filter((t) => t.id !== tableId),
      relations: state.schema.relations.filter(
        (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
      ),
    },
    selectedTableId: state.selectedTableId === tableId ? null : state.selectedTableId,
  })),

  addColumn: (tableId, column) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, column] } : t
      ),
    },
  })),

  updateColumn: (tableId, columnId, updates) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map((c) =>
                c.id === columnId ? { ...c, ...updates } : c
              ),
            }
          : t
      ),
    },
  })),

  removeColumn: (tableId, columnId) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.map((t) =>
        t.id === tableId
          ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
          : t
      ),
      relations: state.schema.relations.filter(
        (r) =>
          !(
            (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
            (r.targetTableId === tableId && r.targetColumnId === columnId)
          )
      ),
    },
  })),

  addRelation: (relation) => set((state) => ({
    schema: {
      ...state.schema,
      relations: [...state.schema.relations, relation],
    },
  })),

  removeRelation: (relationId) => set((state) => ({
    schema: {
      ...state.schema,
      relations: state.schema.relations.filter((r) => r.id !== relationId),
    },
  })),

  setSelectedTable: (tableId) => set({ selectedTableId: tableId }),
  setSelectedColumn: (columnId) => set({ selectedColumnId: columnId }),
  setViewMode: (mode) => set({ viewMode: mode }),

  updateTablePosition: (tableId, position) => set((state) => ({
    schema: {
      ...state.schema,
      tables: state.schema.tables.map((t) =>
        t.id === tableId ? { ...t, position } : t
      ),
    },
  })),
}));

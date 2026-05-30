import { create } from 'zustand';
import type { SchemaWithRelations, Table, Column, Relation, DatabaseDialect } from '@graphite/core';
import { createEmptySchema, createTable, createColumn, createRelation } from '@graphite/core';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  flowX?: number;
  flowY?: number;
  type: 'canvas' | 'node';
  nodeId?: string;
}

interface SchemaState {
  schema: SchemaWithRelations;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  viewMode: 'visual' | 'dsl' | 'split';
  past: SchemaWithRelations[];
  future: SchemaWithRelations[];
  
  setSchema: (schema: SchemaWithRelations) => void;
  saveHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
  setDialect: (dialect: DatabaseDialect) => void;
  addTable: (name: string, schema?: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  removeTable: (tableId: string) => void;
  addColumn: (tableId: string, column: Column) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  addRelation: (relation: Relation) => void;
  removeRelation: (relationId: string) => void;
  updateRelation: (relationId: string, updates: Partial<Pick<Relation, 'type' | 'onDelete' | 'onUpdate'>>) => void;
  setSelectedTable: (tableId: string | null) => void;
  setSelectedColumn: (columnId: string | null) => void;
  setViewMode: (mode: 'visual' | 'dsl' | 'split') => void;
  updateTablePosition: (tableId: string, position: { x: number; y: number }) => void;

  selectedNodeIds: string[];
  clipboardTables: Table[];
  pasteCount: number;
  contextMenu: ContextMenuState;
  focusedTableId: string | null;
  focusedTableIds: string[];
  collapsedTableIds: string[];
  selectNode: (id: string, multi?: boolean) => void;
  toggleTableCollapse: (tableId: string) => void;
  focusTables: (tableIds: string[]) => void;
  toggleNode: (id: string) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  deleteSelectedNodes: () => void;
  showContextMenu: (state: Omit<ContextMenuState, 'visible'>) => void;
  hideContextMenu: () => void;
  copySelectedNodes: () => void;
  pasteNodes: (offsetX?: number, offsetY?: number, atPosition?: { x: number; y: number }) => void;
  updateTablePositions: (updates: { tableId: string; position: { x: number; y: number } }[]) => void;
  selectRelatedNodes: (tableId: string) => void;
  selectNodesByColor: (color: string) => void;
  selectAllNodes: () => void;
  focusTable: (tableId: string | null) => void;
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  schema: createEmptySchema('postgresql'),
  selectedTableId: null,
  selectedColumnId: null,
  viewMode: 'visual',
  selectedNodeIds: [],
  clipboardTables: [],
  pasteCount: 0,
  contextMenu: { visible: false, x: 0, y: 0, type: 'canvas' },
  focusedTableId: null,
  focusedTableIds: [],
  collapsedTableIds: [],
  past: [],
  future: [],

  setSchema: (schema) => set((state) => {
    const newPast = state.past.length >= 50
      ? [...state.past.slice(1), state.schema]
      : [...state.past, state.schema];
    return { schema, past: newPast, future: [] };
  }),

  saveHistorySnapshot: () => set((state) => {
    const newPast = state.past.length >= 50
      ? [...state.past.slice(1), state.schema]
      : [...state.past, state.schema];
    return { past: newPast, future: [] };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return {};
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    return {
      schema: previous,
      past: newPast,
      future: [state.schema, ...state.future],
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      schema: next,
      past: [...state.past, state.schema],
      future: newFuture,
    };
  }),
  
  setDialect: (dialect) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: { ...state.schema, dialect },
    }));
  },

  addTable: (name, schemaName) => {
    get().saveHistorySnapshot();
    set((state) => {
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
    });
  },

  updateTable: (tableId, updates) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((t) =>
          t.id === tableId ? { ...t, ...updates } : t
        ),
      },
    }));
  },

  removeTable: (tableId) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.filter((t) => t.id !== tableId),
        relations: state.schema.relations.filter(
          (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
        ),
      },
      selectedTableId: state.selectedTableId === tableId ? null : state.selectedTableId,
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== tableId),
    }));
  },

  addColumn: (tableId, column) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((t) =>
          t.id === tableId ? { ...t, columns: [...t.columns, column] } : t
        ),
      },
    }));
  },

  updateColumn: (tableId, columnId, updates) => {
    get().saveHistorySnapshot();
    set((state) => ({
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
    }));
  },

  removeColumn: (tableId, columnId) => {
    get().saveHistorySnapshot();
    set((state) => ({
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
    }));
  },

  addRelation: (relation) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        relations: [...state.schema.relations, relation],
      },
    }));
  },

  removeRelation: (relationId) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        relations: state.schema.relations.filter((r) => r.id !== relationId),
      },
    }));
  },

  updateRelation: (relationId, updates) => {
    get().saveHistorySnapshot();
    set((state) => ({
      schema: {
        ...state.schema,
        relations: state.schema.relations.map((r) =>
          r.id === relationId ? { ...r, ...updates } : r
        ),
      },
    }));
  },

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

  selectNode: (id, multi = false) => set((state) => ({
    selectedNodeIds: multi
      ? (state.selectedNodeIds.includes(id) ? state.selectedNodeIds : [...state.selectedNodeIds, id])
      : [id],
  })),

  toggleNode: (id) => set((state) => ({
    selectedNodeIds: state.selectedNodeIds.includes(id)
      ? state.selectedNodeIds.filter((x) => x !== id)
      : [...state.selectedNodeIds, id],
  })),

  selectNodes: (ids) => set({ selectedNodeIds: ids }),

  clearSelection: () => set({ selectedNodeIds: [] }),

  deleteSelectedNodes: () => {
    const { schema, selectedNodeIds, selectedTableId } = get();
    if (selectedNodeIds.length === 0) return;
    get().saveHistorySnapshot();
    const newTables = schema.tables.filter((t) => !selectedNodeIds.includes(t.id));
    const newRelations = schema.relations.filter(
      (r) => !selectedNodeIds.includes(r.sourceTableId) && !selectedNodeIds.includes(r.targetTableId),
    );
    set({
      schema: { ...schema, tables: newTables, relations: newRelations },
      selectedNodeIds: [],
      selectedTableId: selectedNodeIds.includes(selectedTableId ?? '') ? null : selectedTableId,
      selectedColumnId: null,
    });
  },

  showContextMenu: (ctxState) => set({ contextMenu: { ...ctxState, visible: true } }),
  hideContextMenu: () => set((state) => ({ contextMenu: { ...state.contextMenu, visible: false } })),
  copySelectedNodes: () => set((state) => {
    const tablesToCopy = state.schema.tables.filter((t) => state.selectedNodeIds.includes(t.id));
    return {
      clipboardTables: tablesToCopy.map((t) => ({
        ...t,
        columns: t.columns.map((c) => ({ ...c, id: crypto.randomUUID() })),
        indexes: t.indexes.map((i) => ({ ...i, id: crypto.randomUUID(), columns: [...i.columns] })),
      })),
      pasteCount: 0,
    };
  }),

  pasteNodes: (offsetX = 20, offsetY = 20, atPosition?: { x: number; y: number }) => {
    get().saveHistorySnapshot();
    set((state) => {
      if (state.clipboardTables.length === 0) return {};
      const newPasteCount = state.pasteCount + 1;
      const firstOriginal = state.clipboardTables[0];
      const baseX = atPosition?.x ?? (firstOriginal.position?.x ?? 0);
      const baseY = atPosition?.y ?? (firstOriginal.position?.y ?? 0);
      const pastedTables = state.clipboardTables.map((t, index) => ({
        ...t,
        id: crypto.randomUUID(),
        columns: t.columns.map((c) => ({ ...c, id: crypto.randomUUID() })),
        indexes: t.indexes.map((i) => ({ ...i, id: crypto.randomUUID(), columns: [...i.columns] })),
        position: atPosition
          ? {
              x: baseX + (t.position?.x ?? 0) - (firstOriginal.position?.x ?? 0) + offsetX * index,
              y: baseY + (t.position?.y ?? 0) - (firstOriginal.position?.y ?? 0) + offsetY * index,
            }
          : {
              x: (t.position?.x ?? 0) + offsetX * newPasteCount,
              y: (t.position?.y ?? 0) + offsetY * newPasteCount,
            },
      }));
      return {
        schema: {
          ...state.schema,
          tables: [...state.schema.tables, ...pastedTables],
        },
        selectedNodeIds: pastedTables.map((t) => t.id),
        pasteCount: newPasteCount,
      };
    });
  },

  updateTablePositions: (updates) => set((state) => {
    const updateMap = new Map(updates.map((u) => [u.tableId, u.position]));
    return {
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((t) =>
          updateMap.has(t.id) ? { ...t, position: updateMap.get(t.id)! } : t
        ),
      },
    };
  }),

  selectRelatedNodes: (tableId) => set((state) => {
    const related = new Set([tableId]);
    state.schema.relations.forEach((r) => {
      if (r.sourceTableId === tableId) related.add(r.targetTableId);
      if (r.targetTableId === tableId) related.add(r.sourceTableId);
    });
    return { selectedNodeIds: Array.from(related) };
  }),

  selectNodesByColor: (color) => set((state) => ({
    selectedNodeIds: state.schema.tables
      .filter((t) => t.color === color)
      .map((t) => t.id),
  })),

  selectAllNodes: () => set((state) => ({
    selectedNodeIds: state.schema.tables.map((t) => t.id),
  })),

  toggleTableCollapse: (tableId) => set((state) => ({
    collapsedTableIds: state.collapsedTableIds.includes(tableId)
      ? state.collapsedTableIds.filter((id) => id !== tableId)
      : [...state.collapsedTableIds, tableId],
  })),

  focusTable: (tableId) => set({ focusedTableId: tableId }),

  focusTables: (tableIds) => set({ focusedTableIds: tableIds }),
}));

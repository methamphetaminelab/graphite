'use client';

import React, { useState, useCallback } from 'react';
import { useSchemaStore } from '@/store/schemaStore';
import Toolbar from '@/components/Toolbar';
import Sidebar from '@/components/Sidebar';
import VisualEditor from '@/components/VisualEditor';
import DslEditor from '@/components/DslEditor';
import TableEditDialog from '@/components/TableEditDialog';
import ColumnEditDialog from '@/components/ColumnEditDialog';

export default function Home() {
  const { viewMode } = useSchemaStore();
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<{ tableId: string; columnId: string } | null>(null);
  const [addingColumnTableId, setAddingColumnTableId] = useState<string | null>(null);
  const [relationStart, setRelationStart] = useState<{ tableId: string; columnId: string } | null>(null);

  const handleEditTable = useCallback((tableId: string) => {
    setEditingTableId(tableId);
  }, []);

  const handleEditColumn = useCallback((tableId: string, columnId: string) => {
    setEditingColumn({ tableId, columnId });
  }, []);

  const handleAddColumn = useCallback((tableId: string) => {
    setAddingColumnTableId(tableId);
  }, []);

  const handleStartRelation = useCallback((tableId: string, columnId: string) => {
    setRelationStart({ tableId, columnId });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toolbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onEditTable={handleEditTable}
          onEditColumn={handleEditColumn}
          onAddColumn={handleAddColumn}
        />
        
        <div className="flex-1 overflow-hidden">
          {viewMode === 'visual' ? (
            <VisualEditor
              onEditTable={handleEditTable}
              onEditColumn={handleEditColumn}
              onAddColumn={handleAddColumn}
              onStartRelation={handleStartRelation}
              onDeleteRelation={(relationId) => {
                useSchemaStore.getState().removeRelation(relationId);
              }}
            />
          ) : (
            <DslEditor />
          )}
        </div>
      </div>

      {/* Dialogs */}
      {editingTableId && (
        <TableEditDialog
          tableId={editingTableId}
          onClose={() => setEditingTableId(null)}
        />
      )}

      {editingColumn && (
        <ColumnEditDialog
          tableId={editingColumn.tableId}
          columnId={editingColumn.columnId}
          onClose={() => setEditingColumn(null)}
        />
      )}

      {addingColumnTableId && (
        <ColumnEditDialog
          tableId={addingColumnTableId}
          onClose={() => setAddingColumnTableId(null)}
        />
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useSchemaStore } from '../store/schemaStore';
import { createTable } from '@graphite/core';

const COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray', value: '#6b7280' },
];

interface MenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
}

function MenuItem({ onClick, children, disabled }: MenuItemProps & { disabled?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200 hover:bg-gray-700'}`}
    >
      {children}
    </button>
  );
}

MenuItem.displayName = 'MenuItem';

export function CanvasContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    contextMenu,
    hideContextMenu,
    schema,
    setSchema,
    addTable,
    updateTable,
    removeTable,
    selectedNodeIds,
    selectNodes,
    clearSelection,
    copySelectedNodes,
    deleteSelectedNodes,
    pasteNodes,
    selectRelatedNodes,
    selectNodesByColor,
    selectAllNodes,
    undo,
    redo,
    past,
    future,
  } = useSchemaStore();

  const getTargetIds = useCallback(() => {
    if (contextMenu.nodeId && selectedNodeIds.length > 0 && selectedNodeIds.includes(contextMenu.nodeId)) {
      return selectedNodeIds;
    }
    return contextMenu.nodeId ? [contextMenu.nodeId] : [];
  }, [contextMenu.nodeId, selectedNodeIds]);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const menu = menuRef.current;
    if (menu) {
      const firstItem = menu.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
        return;
      }

      const items = Array.from(
        menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
      );
      const active = document.activeElement as HTMLElement;
      const idx = items.indexOf(active as HTMLButtonElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[(idx + 1) % items.length];
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        prev?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible, hideContextMenu]);

  const handleAddTable = useCallback(() => {
    let name = 'new_table';
    let suffix = 1;
    const existingNames = new Set(schema.tables.map((t) => t.name));
    while (existingNames.has(name)) {
      name = `new_table_${suffix++}`;
    }
    addTable(name);
    const state = useSchemaStore.getState();
    const newTableId = state.selectedTableId;
    if (newTableId) {
      const x = contextMenu.flowX ?? contextMenu.x - 100;
      const y = contextMenu.flowY ?? contextMenu.y - 50;
      updateTable(newTableId, {
        position: { x, y },
      });
    }
    hideContextMenu();
  }, [contextMenu.x, contextMenu.y, contextMenu.flowX, contextMenu.flowY, schema.tables, addTable, updateTable, hideContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (!contextMenu.nodeId) return;

    const targetIds = getTargetIds();
    const originals = schema.tables.filter((t) => targetIds.includes(t.id));
    if (originals.length === 0) return;

    const copies = originals.map((original, index) => {
      const base = createTable(original.name + '_copy', original.schema);
      const offset = 20 + index * 10;
      return {
        ...base,
        columns: original.columns.map((c) => ({
          ...c,
          id: crypto.randomUUID(),
        })),
        indexes: original.indexes.map((i) => ({
          ...i,
          id: crypto.randomUUID(),
          columns: [...i.columns],
        })),
        color: original.color,
        note: original.note,
        position: {
          x: (original.position?.x ?? 0) + offset,
          y: (original.position?.y ?? 0) + offset,
        },
      };
    });

    setSchema({
      ...schema,
      tables: [...schema.tables, ...copies],
    });
    selectNodes(copies.map((c) => c.id));
    hideContextMenu();
  }, [contextMenu.nodeId, getTargetIds, schema, setSchema, selectNodes, hideContextMenu]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.nodeId) return;

    const targetIds = getTargetIds();

    if (targetIds.length > 1) {
      deleteSelectedNodes();
    } else {
      removeTable(contextMenu.nodeId);
    }
    hideContextMenu();
  }, [contextMenu.nodeId, getTargetIds, deleteSelectedNodes, removeTable, hideContextMenu]);

  const handleChangeColor = useCallback(
    (color: string) => {
      if (!contextMenu.nodeId) return;

      const targetIds = getTargetIds();
      targetIds.forEach((id) => updateTable(id, { color }));
      hideContextMenu();
    },
    [contextMenu.nodeId, getTargetIds, updateTable, hideContextMenu]
  );

  const handleSelectRelated = useCallback(() => {
    if (!contextMenu.nodeId) return;
    selectRelatedNodes(contextMenu.nodeId);
    hideContextMenu();
  }, [contextMenu.nodeId, selectRelatedNodes, hideContextMenu]);

  const handleCopy = useCallback(() => {
    if (!contextMenu.nodeId) {
      hideContextMenu();
      return;
    }

    const targetIds = getTargetIds();
    if (targetIds.length > 1) {
      copySelectedNodes();
    } else {
      selectNodes([contextMenu.nodeId]);
      copySelectedNodes();
    }
    hideContextMenu();
  }, [contextMenu.nodeId, getTargetIds, copySelectedNodes, selectNodes, hideContextMenu]);

  const handlePaste = useCallback(() => {
    const x = contextMenu.flowX ?? contextMenu.x;
    const y = contextMenu.flowY ?? contextMenu.y;
    pasteNodes(20, 20, { x, y });
    hideContextMenu();
  }, [pasteNodes, hideContextMenu, contextMenu.x, contextMenu.y, contextMenu.flowX, contextMenu.flowY]);

  const handleSelectByColor = useCallback(
    (color: string) => {
      selectNodesByColor(color);
      hideContextMenu();
    },
    [selectNodesByColor, hideContextMenu]
  );

  const handleSelectAll = useCallback(() => {
    selectAllNodes();
    hideContextMenu();
  }, [selectAllNodes, hideContextMenu]);

  const handleDeselect = useCallback(() => {
    clearSelection();
    hideContextMenu();
  }, [clearSelection, hideContextMenu]);

  const handleUndo = useCallback(() => {
    undo();
    hideContextMenu();
  }, [undo, hideContextMenu]);

  const handleRedo = useCallback(() => {
    redo();
    hideContextMenu();
  }, [redo, hideContextMenu]);

  if (!contextMenu.visible) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={contextMenu.type === 'canvas' ? 'Canvas actions' : 'Table actions'}
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[160px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.type === 'canvas' ? (
        <>
          <MenuItem onClick={handleAddTable}>Add Table</MenuItem>
          <MenuItem onClick={handleSelectAll}>Select All</MenuItem>
          {selectedNodeIds.length > 0 && (
            <MenuItem onClick={handleDeselect}>Deselect</MenuItem>
          )}
          <div role="separator" className="border-t border-gray-700 my-1" />
          <MenuItem onClick={handleUndo} disabled={past.length === 0}>Undo</MenuItem>
          <MenuItem onClick={handleRedo} disabled={future.length === 0}>Redo</MenuItem>
          <div role="separator" className="border-t border-gray-700 my-1" />
          <div className="px-3 py-1 text-xs text-gray-400">Select by Color</div>
          <div className="flex gap-1 px-3 py-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                role="menuitem"
                className="w-5 h-5 rounded-full border border-gray-600"
                style={{ backgroundColor: c.value }}
                onClick={() => handleSelectByColor(c.value)}
                aria-label={`Select all ${c.name} tables`}
                title={c.name}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <MenuItem onClick={handleDuplicate}>Duplicate</MenuItem>
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
          <div role="separator" className="border-t border-gray-700 my-1" />
          <MenuItem onClick={handleUndo} disabled={past.length === 0}>Undo</MenuItem>
          <MenuItem onClick={handleRedo} disabled={future.length === 0}>Redo</MenuItem>
          <div role="separator" className="border-t border-gray-700 my-1" />
          <div className="px-3 py-1 text-xs text-gray-400">Change Color</div>
          <div className="flex gap-1 px-3 py-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                role="menuitem"
                className="w-5 h-5 rounded-full border border-gray-600"
                style={{ backgroundColor: c.value }}
                onClick={() => handleChangeColor(c.value)}
                aria-label={`Set color to ${c.name}`}
                title={c.name}
              />
            ))}
          </div>
          <div role="separator" className="border-t border-gray-700 my-1" />
          <MenuItem onClick={handleSelectRelated}>Select Related</MenuItem>
          <MenuItem onClick={handleCopy}>Copy</MenuItem>
          <MenuItem onClick={handlePaste}>Paste</MenuItem>
          <div role="separator" className="border-t border-gray-700 my-1" />
          <div className="px-3 py-1 text-xs text-gray-400">Select by Color</div>
          <div className="flex gap-1 px-3 py-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                role="menuitem"
                className="w-5 h-5 rounded-full border border-gray-600"
                style={{ backgroundColor: c.value }}
                onClick={() => handleSelectByColor(c.value)}
                aria-label={`Select all ${c.name} tables`}
                title={c.name}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

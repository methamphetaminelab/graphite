import { useState, useCallback, useRef } from 'react';
import { useReactFlow, Node, XYPosition } from '@xyflow/react';

export interface SelectionBox {
  start: XYPosition;
  end: XYPosition;
}

const SELECTION_THRESHOLD = 5; 

export function useBoxSelection(
  onSelectNodes: (ids: string[], multi: boolean) => void,
  onClearSelection: () => void
) {
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const { getNodes, screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const multiSelectRef = useRef(false);
  const hasExceededThresholdRef = useRef(false);
  const selectionBoxRef = useRef<SelectionBox | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__controls') || target.closest('.react-flow__minimap')) {
      return;
    }
    
    if (!e.ctrlKey && !e.metaKey) {
      onClearSelection();
      return;
    }
    multiSelectRef.current = true;
    const screenPos = { x: e.clientX, y: e.clientY };
    startPosRef.current = screenPos;
    
    hasExceededThresholdRef.current = false;
    selectionBoxRef.current = null;
    setIsSelecting(false);
    setSelectionBox(null);
  }, [onClearSelection]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPosRef.current) return;

    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);

    if (!hasExceededThresholdRef.current && (dx > SELECTION_THRESHOLD || dy > SELECTION_THRESHOLD)) {
      hasExceededThresholdRef.current = true;
      setIsSelecting(true);
      const box = { start: startPosRef.current, end: { x: e.clientX, y: e.clientY } };
      selectionBoxRef.current = box;
      setSelectionBox(box);
    }

    if (hasExceededThresholdRef.current) {
      const box = { ...selectionBoxRef.current!, end: { x: e.clientX, y: e.clientY } };
      selectionBoxRef.current = box;
      setSelectionBox(box);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (hasExceededThresholdRef.current && selectionBoxRef.current) {
      const nodes = getNodes();
      const startFlow = screenToFlowPosition(selectionBoxRef.current.start);
      const endFlow = screenToFlowPosition(selectionBoxRef.current.end);
      const flowBox: SelectionBox = { start: startFlow, end: endFlow };
      const selectedIds = getIntersectingNodes(nodes, flowBox);
      onSelectNodes(selectedIds, multiSelectRef.current);
    }
    setIsSelecting(false);
    hasExceededThresholdRef.current = false;
    selectionBoxRef.current = null;
    setSelectionBox(null);
    startPosRef.current = null;
    multiSelectRef.current = false;
  }, [getNodes, onSelectNodes, screenToFlowPosition]);

  const handlePointerLeave = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      hasExceededThresholdRef.current = false;
      selectionBoxRef.current = null;
      setSelectionBox(null);
      startPosRef.current = null;
      multiSelectRef.current = false;
    }
  }, [isSelecting]);

  return {
    selectionBox: hasExceededThresholdRef.current ? selectionBoxRef.current : null,
    isSelecting,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}

function getIntersectingNodes(nodes: Node[], box: SelectionBox): string[] {
  const left = Math.min(box.start.x, box.end.x);
  const right = Math.max(box.start.x, box.end.x);
  const top = Math.min(box.start.y, box.end.y);
  const bottom = Math.max(box.start.y, box.end.y);

  return nodes
    .filter(n => {
      
      const nw = (n.measured?.width ?? n.width ?? 200);
      const nh = (n.measured?.height ?? n.height ?? 100);
      const nx = n.position.x;
      const ny = n.position.y;
      return nx < right && nx + nw > left && ny < bottom && ny + nh > top;
    })
    .map(n => n.id);
}

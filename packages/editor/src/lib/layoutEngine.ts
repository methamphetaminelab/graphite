import type { Table, Relation, Position } from '@graphite/core';

const RELATION_WEIGHT: Record<Relation['type'], number> = {
  many_to_many: 0,
  one_to_many: 1,
  one_to_one: 2,
};

export function computeLayout(tables: Table[], relations: Relation[]): Map<string, Position> {
  if (tables.length === 0) return new Map();

  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const parents = new Map<string, string[]>();
  tables.forEach(t => {
    graph.set(t.id, []);
    inDegree.set(t.id, 0);
    parents.set(t.id, []);
  });

  relations.forEach(r => {
    graph.get(r.sourceTableId)!.push(r.targetTableId);
    inDegree.set(r.targetTableId, (inDegree.get(r.targetTableId) || 0) + 1);
    parents.get(r.targetTableId)!.push(r.sourceTableId);
  });

  breakCycles(graph, inDegree, relations);

  const levels = new Map<string, number>();
  const queue: string[] = [];
  tables.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
      levels.set(t.id, 0);
    }
  });

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const level = levels.get(id)!;
    for (const child of graph.get(id) || []) {
      levels.set(child, Math.max(levels.get(child) || 0, level + 1));
      inDegree.set(child, inDegree.get(child)! - 1);
      if (inDegree.get(child) === 0) {
        queue.push(child);
      }
    }
  }

  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, id) => {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  });

  tables.forEach(t => {
    if (!levels.has(t.id)) {
      if (!levelGroups.has(0)) levelGroups.set(0, []);
      levelGroups.get(0)!.push(t.id);
      levels.set(t.id, 0);
    }
  });

  const tableOrder = new Map(tables.map((t, i) => [t.id, i]));
  for (const ids of levelGroups.values()) {
    ids.sort((a, b) => (tableOrder.get(a) ?? 0) - (tableOrder.get(b) ?? 0));
  }

  const yPositions = new Map<string, number>();
  const levelGapX = 380;
  const nodeGapY = 60; 
  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

  const tableMap = new Map(tables.map(t => [t.id, t]));
  function estimateHeight(tableId: string): number {
    const table = tableMap.get(tableId);
    if (!table) return 120;
    
    return 40 + 8 + table.columns.length * 28 + 28 + 8;
  }

  for (const level of sortedLevels) {
    const ids = levelGroups.get(level)!;
    const unplaced: string[] = [];

    for (const id of ids) {
      const parentIds = parents.get(id) || [];
      const parentsInPrevLevel = parentIds.filter(pid => levels.get(pid) === level - 1);

      if (parentsInPrevLevel.length > 0) {
        
        const avgY =
          parentsInPrevLevel.reduce((sum, pid) => sum + (yPositions.get(pid) || 0), 0) /
          parentsInPrevLevel.length;
        yPositions.set(id, avgY);
      } else {
        unplaced.push(id);
      }
    }

    let currentY = 0;
    for (const id of ids) {
      if (yPositions.has(id)) {
        currentY = Math.max(currentY, yPositions.get(id)! + estimateHeight(id) + nodeGapY);
      }
    }
    for (const id of unplaced) {
      yPositions.set(id, currentY);
      currentY += estimateHeight(id) + nodeGapY;
    }

    const sortedIds = [...ids].sort((a, b) => (yPositions.get(a) || 0) - (yPositions.get(b) || 0));
    for (let i = 1; i < sortedIds.length; i++) {
      const prevId = sortedIds[i - 1];
      const currId = sortedIds[i];
      const prevY = yPositions.get(prevId)!;
      const prevH = estimateHeight(prevId);
      const currY = yPositions.get(currId)!;
      const minY = prevY + prevH + nodeGapY;
      if (currY < minY) {
        yPositions.set(currId, minY);
      }
    }
  }

  const positions = new Map<string, Position>();
  for (const [level, ids] of levelGroups) {
    const x = level * levelGapX;
    for (const id of ids) {
      positions.set(id, { x, y: yPositions.get(id) || 0 });
    }
  }

  return positions;
}

function breakCycles(
  graph: Map<string, string[]>,
  inDegree: Map<string, number>,
  relations: Relation[]
): void {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(node: string, parentNode: string | null): void {
    visited.add(node);
    recStack.add(node);
    if (parentNode !== null) {
      parent.set(node, parentNode);
    }

    const neighbors = [...(graph.get(node) || [])];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, node);
      } else if (recStack.has(neighbor)) {

        const cycleEdges: Relation[] = [];

        const backEdge = relations.find(
          r => r.sourceTableId === node && r.targetTableId === neighbor
        );
        if (backEdge) cycleEdges.push(backEdge);

        let current = node;
        while (current !== neighbor) {
          const p = parent.get(current);
          if (!p) break;
          const edge = relations.find(
            r => r.sourceTableId === p && r.targetTableId === current
          );
          if (edge) cycleEdges.push(edge);
          current = p;
        }

        let lowestEdge: Relation | null = null;
        let lowestWeight = Infinity;
        for (const edge of cycleEdges) {
          const w = RELATION_WEIGHT[edge.type];
          if (w < lowestWeight) {
            lowestWeight = w;
            lowestEdge = edge;
          }
        }

        if (lowestEdge) {
          const src = lowestEdge.sourceTableId;
          const tgt = lowestEdge.targetTableId;
          const srcNeighbors = graph.get(src);
          if (srcNeighbors) {
            const idx = srcNeighbors.indexOf(tgt);
            if (idx !== -1) srcNeighbors.splice(idx, 1);
          }
          inDegree.set(tgt, Math.max(0, (inDegree.get(tgt) || 0) - 1));
        }
      }
    }

    recStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, null);
    }
  }
}

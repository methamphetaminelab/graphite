import type { Column } from '../types.js';

export function renderColumnType(column: Column): string {
  if (column.hybridType && column.hybridType.args.length > 0) {
    const args = column.hybridType.args.join(', ');
    return `${column.hybridType.base}(${args})`;
  }
  return column.type;
}

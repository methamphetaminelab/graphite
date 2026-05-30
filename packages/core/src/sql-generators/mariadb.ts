import type { SchemaWithRelations, Table } from '../types.js';
import { renderColumnType } from './utils.js';

export function generateMariaDB(schema: SchemaWithRelations): string {
  let sql = `-- Generated MariaDB DDL\n\n`;

  for (const table of schema.tables) {
    sql += generateTable(table, schema);
  }

  for (const relation of schema.relations) {
    sql += generateForeignKey(relation, schema);
  }

  return sql;
}

function generateTable(table: Table, schema: SchemaWithRelations): string {
  const schemaPrefix = table.schema ? `\`${table.schema}\`.` : '';
  let sql = `CREATE TABLE ${schemaPrefix}\`${table.name}\` (\n`;
  
  const lines: string[] = [];
  for (const column of table.columns) {
    let line = `  \`${column.name}\` ${renderColumnType(column)}`;
    if (!column.nullable) line += ' NOT NULL';
    if (column.defaultValue !== undefined) line += ` DEFAULT ${column.defaultValue}`;
    if (column.autoIncrement) line += ' AUTO_INCREMENT';
    if (column.primaryKey) line += ' PRIMARY KEY';
    if (column.unique && !column.primaryKey) line += ' UNIQUE';
    lines.push(line);
  }
  
  sql += lines.join(',\n');
  sql += '\n) ENGINE=InnoDB;\n\n';

  for (const index of table.indexes) {
    if (index.name === 'primary') continue;
    const unique = index.unique ? 'UNIQUE ' : '';
    sql += `CREATE ${unique}INDEX \`${index.name}\` ON ${schemaPrefix}\`${table.name}\` (${index.columns.map(c => `\`${c}\``).join(', ')});\n`;
  }
  
  if (table.indexes.length > 0) sql += '\n';
  
  return sql;
}

function generateForeignKey(relation: SchemaWithRelations['relations'][0], schema: SchemaWithRelations): string {
  const sourceTable = schema.tables.find(t => t.id === relation.sourceTableId);
  const targetTable = schema.tables.find(t => t.id === relation.targetTableId);
  if (!sourceTable || !targetTable) return '';

  const sourceColumn = sourceTable.columns.find(c => c.id === relation.sourceColumnId);
  const targetColumn = targetTable.columns.find(c => c.id === relation.targetColumnId);
  if (!sourceColumn || !targetColumn) return '';

  const schemaPrefix = sourceTable.schema ? `\`${sourceTable.schema}\`.` : '';
  let sql = `ALTER TABLE ${schemaPrefix}\`${sourceTable.name}\` ADD CONSTRAINT \`fk_${sourceTable.name}_${sourceColumn.name}\``;
  sql += ` FOREIGN KEY (\`${sourceColumn.name}\`) REFERENCES `;
  
  const targetSchemaPrefix = targetTable.schema ? `\`${targetTable.schema}\`.` : '';
  sql += `${targetSchemaPrefix}\`${targetTable.name}\` (\`${targetColumn.name}\`)`;
  
  if (relation.onDelete) sql += ` ON DELETE ${relation.onDelete.toUpperCase().replace('_', ' ')}`;
  if (relation.onUpdate) sql += ` ON UPDATE ${relation.onUpdate.toUpperCase().replace('_', ' ')}`;
  
  sql += ';\n';
  return sql;
}

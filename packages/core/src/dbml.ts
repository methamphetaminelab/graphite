import type { SchemaWithRelations, Table, Column, Enum, Relation, HybridType } from './types.js';

const HYBRID_TYPE_REGEX = /^(\w+)\(([^)]+)\)$/;

function parseHybridType(typeStr: string): { type: string; hybridType?: HybridType } {
  const match = typeStr.match(HYBRID_TYPE_REGEX);
  if (!match) return { type: typeStr };
  const base = match[1];
  const args = match[2].split(',').map(s => {
    const trimmed = s.trim();
    const num = Number(trimmed);
    return Number.isNaN(num) ? trimmed : num;
  });
  return { type: typeStr, hybridType: { base, args } };
}

export function generateDbml(schema: SchemaWithRelations): string {
  let dbml = '';

  for (const enumDef of schema.enums) {
    dbml += `Enum ${enumDef.name} {\n`;
    for (const value of enumDef.values) {
      dbml += `  ${value}\n`;
    }
    dbml += `}\n\n`;
  }

  for (const table of schema.tables) {
    const schemaPrefix = table.schema ? `${table.schema}.` : '';
    dbml += `Table ${schemaPrefix}${table.name} {\n`;
    
    for (const column of table.columns) {
      let line = `  ${column.name} ${column.type}`;
      
      if (column.primaryKey) line += ' [pk]';
      if (column.unique && !column.primaryKey) line += ' [unique]';
      if (!column.nullable) line += ' [not null]';
      if (column.autoIncrement) line += ' [increment]';
      if (column.defaultValue !== undefined) line += ` [default: ${column.defaultValue}]`;
      if (column.note) line += ` [note: '${column.note.replace(/'/g, "\\'")}']`;
      
      dbml += line + '\n';
    }

    for (const index of table.indexes) {
      let line = `  ${index.name === 'primary' ? '' : index.name}`;
      line += ` [${index.type}]`;
      if (index.unique) line += ' [unique]';
      line += ` (${index.columns.join(', ')})`;
      dbml += `  Index ${line}\n`;
    }

    if (table.note) {
      dbml += `  Note: '${table.note.replace(/'/g, "\\'")}'\n`;
    }

    dbml += `}\n\n`;
  }

  for (const relation of schema.relations) {
    const sourceTable = schema.tables.find(t => t.id === relation.sourceTableId);
    const targetTable = schema.tables.find(t => t.id === relation.targetTableId);
    if (!sourceTable || !targetTable) continue;

    const sourceColumn = sourceTable.columns.find(c => c.id === relation.sourceColumnId);
    const targetColumn = targetTable.columns.find(c => c.id === relation.targetColumnId);
    if (!sourceColumn || !targetColumn) continue;

    const sourceSchema = sourceTable.schema ? `${sourceTable.schema}.` : '';
    const targetSchema = targetTable.schema ? `${targetTable.schema}.` : '';
    
    let relLine = `Ref: ${sourceSchema}${sourceTable.name}.${sourceColumn.name} > ${targetSchema}${targetTable.name}.${targetColumn.name}`;
    
    if (relation.onDelete || relation.onUpdate) {
      const actions: string[] = [];
      if (relation.onDelete) actions.push(`delete: ${relation.onDelete}`);
      if (relation.onUpdate) actions.push(`update: ${relation.onUpdate}`);
      relLine += ` [${actions.join(', ')}]`;
    }
    
    dbml += relLine + '\n';
  }

  return dbml;
}

export function parseDbml(dbml: string): SchemaWithRelations {
  const schema: SchemaWithRelations = {
    name: 'imported_schema',
    dialect: 'postgresql',
    tables: [],
    enums: [],
    notes: [],
    relations: [],
  };

  const lines = dbml.split('\n');
  let currentTable: Table | null = null;
  let currentEnum: Enum | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Table ')) {
      const match = line.match(/Table\s+(?:(\w+)\.)?(\w+)\s*\{/);
      if (match) {
        currentTable = {
          id: `table-${match[1] ? match[1] + '.' : ''}${match[2]}`,
          name: match[2],
          schema: match[1],
          columns: [],
          indexes: [],
        };
        schema.tables.push(currentTable);
      }
      currentEnum = null;
    } else if (line.startsWith('Enum ')) {
      const match = line.match(/Enum\s+(\w+)\s*\{/);
      if (match) {
        currentEnum = {
          id: `enum-${match[1]}`,
          name: match[1],
          values: [],
        };
        schema.enums.push(currentEnum);
      }
      currentTable = null;
    } else if (line === '}' && currentTable) {
      currentTable = null;
    } else if (line === '}' && currentEnum) {
      currentEnum = null;
    } else if (currentEnum && line) {
      currentEnum.values.push(line);
    } else if (currentTable && line) {
      if (line.startsWith('Note:')) {
        const noteMatch = line.match(/Note:\s*['"](.+?)['"]$/);
        if (noteMatch) currentTable.note = noteMatch[1];
      } else if (line.startsWith('Index ')) {
        
        const idxMatch = line.match(/Index\s+(\w+)?\s*\[(\w+)\](?:\s*\[unique\])?\s*\(([^)]+)\)/);
        if (idxMatch) {
          currentTable.indexes.push({
            id: `idx-${currentTable.name}-${idxMatch[1] || currentTable.indexes.length}`,
            name: idxMatch[1] || `idx_${currentTable.indexes.length}`,
            type: idxMatch[2] as any,
            unique: line.includes('[unique]'),
            columns: idxMatch[3].split(',').map(c => c.trim()),
          });
        }
      } else {
        
        const colMatch = line.match(/^(\w+)\s+(\S+)(.*)$/);
        if (colMatch) {
          const { type, hybridType } = parseHybridType(colMatch[2]);
          const column: Column = {
            id: `col-${currentTable.name}-${colMatch[1]}`,
            name: colMatch[1],
            type,
            hybridType,
            nullable: true,
            primaryKey: false,
            unique: false,
            autoIncrement: false,
          };

          const attrs = colMatch[3];
          if (attrs) {
            if (attrs.includes('[pk]')) column.primaryKey = true;
            if (attrs.includes('[unique]')) column.unique = true;
            if (attrs.includes('[not null]')) column.nullable = false;
            if (attrs.includes('[increment]')) column.autoIncrement = true;
            
            const defaultMatch = attrs.match(/\[default:\s*([^\]]+)\]/);
            if (defaultMatch) column.defaultValue = defaultMatch[1].trim();
            
            const noteMatch = attrs.match(/\[note:\s*['"](.+?)['"]\]/);
            if (noteMatch) column.note = noteMatch[1];
          }

          currentTable.columns.push(column);
        }
      }
    } else if (line.startsWith('Ref:')) {
      const refMatch = line.match(/Ref:\s+(?:(\w+)\.)?(\w+)\.(\w+)\s*>\s+(?:(\w+)\.)?(\w+)\.(\w+)/);
      if (refMatch) {
        const sourceTable = schema.tables.find(t => t.name === refMatch[2] && t.schema === refMatch[1]);
        const targetTable = schema.tables.find(t => t.name === refMatch[5] && t.schema === refMatch[4]);
        
        if (sourceTable && targetTable) {
          const sourceColumn = sourceTable.columns.find(c => c.name === refMatch[3]);
          const targetColumn = targetTable.columns.find(c => c.name === refMatch[6]);
          
          if (sourceColumn && targetColumn) {
            const relation: Relation = {
              id: `rel-${sourceTable.name}-${sourceColumn.name}-${targetTable.name}-${targetColumn.name}`,
              sourceTableId: sourceTable.id,
              sourceColumnId: sourceColumn.id,
              targetTableId: targetTable.id,
              targetColumnId: targetColumn.id,
              type: 'one_to_many',
            };

            const deleteMatch = line.match(/delete:\s*(\w+)/);
            if (deleteMatch) relation.onDelete = deleteMatch[1] as any;
            
            const updateMatch = line.match(/update:\s*(\w+)/);
            if (updateMatch) relation.onUpdate = updateMatch[1] as any;

            schema.relations.push(relation);
          }
        }
      }
    }
  }

  return schema;
}


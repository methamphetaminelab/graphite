import type { SchemaWithRelations, Table, Column, Relation } from './types.js';

export function parseSQL(sql: string): SchemaWithRelations {
  const tables: Table[] = [];
  const relations: Relation[] = [];

  const cleanedSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '') 
    .replace(/--.*$/gm, '') 
    .replace(/#.*$/gm, ''); 

  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([^`\s(]+)`?\s*\(/gi;

  let match;
  while ((match = createTableRegex.exec(cleanedSql)) !== null) {
    const tableName = match[1].trim();
    const startIndex = match.index + match[0].length - 1; 

    let depth = 1;
    let endIndex = startIndex + 1;
    while (depth > 0 && endIndex < cleanedSql.length) {
      const char = cleanedSql[endIndex];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      endIndex++;
    }

    if (depth !== 0) continue; 

    const body = cleanedSql.slice(startIndex + 1, endIndex - 1).trim();

    const tableId = `table-${tableName}`;
    const columns: Column[] = [];
    const primaryKeys: string[] = [];

    const lines = splitColumns(body);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map(s => s.trim().replace(/^`/, '').replace(/`$/, ''));
        primaryKeys.push(...pkCols);
        continue;
      }

      const fkMatch = trimmed.match(/(?:CONSTRAINT\s+`?\w+`?\s+)?FOREIGN\s+KEY\s*\(`?([^`]+)`?\)\s*REFERENCES\s+`?([^`\s(]+)`?\s*\(`?([^`]+)`?\)/i);
      if (fkMatch) {
        const sourceColumn = fkMatch[1].trim();
        const targetTable = fkMatch[2].trim();
        const targetColumn = fkMatch[3].trim();
        relations.push({
          id: `rel-${tableName}-${sourceColumn}-${targetTable}`,
          sourceTableId: tableId,
          sourceColumnId: `col-${tableName}-${sourceColumn}`,
          targetTableId: `table-${targetTable}`,
          targetColumnId: `col-${targetTable}-${targetColumn}`,
          type: 'one_to_many',
        });
        continue;
      }

      if (/^(PRIMARY|UNIQUE|KEY|FOREIGN|CONSTRAINT|INDEX|FULLTEXT|SPATIAL)\s/i.test(trimmed)) {
        continue;
      }

      const colMatch = trimmed.match(/^`?([^`\s]+)`?\s+([\w()]+(?:\s*\([^)]*\))?)\s*(.*)$/i);
      if (colMatch) {
        const colName = colMatch[1].trim();
        const colType = colMatch[2].trim();
        const constraints = colMatch[3].trim().toUpperCase();

        const isNullable = !constraints.includes('NOT NULL');
        const isPrimaryKey = constraints.includes('PRIMARY KEY') || primaryKeys.includes(colName);
        const isUnique = constraints.includes('UNIQUE');
        const isAutoIncrement = constraints.includes('AUTO_INCREMENT') || constraints.includes('SERIAL');

        let defaultValue: string | undefined;
        const defaultMatch = constraints.match(/DEFAULT\s+('[^']*'|[^\s,]+)/i);
        if (defaultMatch) {
          defaultValue = defaultMatch[1].replace(/^'/, '').replace(/'$/, '');
        }

        columns.push({
          id: `col-${tableName}-${colName}`,
          name: colName,
          type: colType,
          nullable: isNullable,
          defaultValue,
          primaryKey: isPrimaryKey,
          unique: isUnique,
          autoIncrement: isAutoIncrement,
        });
      }
    }

    tables.push({
      id: tableId,
      name: tableName,
      columns,
      indexes: [],
    });
  }

  return {
    name: 'imported_schema',
    dialect: 'mysql',
    tables,
    enums: [],
    notes: [],
    relations,
  };
}

function splitColumns(body: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

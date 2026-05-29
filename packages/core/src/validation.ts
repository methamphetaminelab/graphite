import type { SchemaWithRelations, Table, Column, Relation, DatabaseDialect } from './types.js';

export function validateSchema(schema: SchemaWithRelations): string[] {
  const errors: string[] = [];

  if (!schema.name || schema.name.trim() === '') {
    errors.push('Schema name is required');
  }

  const tableNames = new Set<string>();
  for (const table of schema.tables) {
    if (!table.name || table.name.trim() === '') {
      errors.push(`Table ${table.id || '(unknown)'} has no name`);
    } else {
      const fullName = table.schema ? `${table.schema}.${table.name}` : table.name;
      if (tableNames.has(fullName)) {
        errors.push(`Duplicate table name: ${fullName}`);
      }
      tableNames.add(fullName);
    }

    const columnNames = new Set<string>();
    for (const column of table.columns) {
      if (!column.name || column.name.trim() === '') {
        errors.push(`Column ${column.id || '(unknown)'} in table ${table.name} has no name`);
      } else if (columnNames.has(column.name)) {
        errors.push(`Duplicate column name: ${column.name} in table ${table.name}`);
      } else {
        columnNames.add(column.name);
      }
    }

    const pkColumns = table.columns.filter(c => c.primaryKey);
    if (pkColumns.length === 0) {
      errors.push(`Table ${table.name} has no primary key`);
    }
  }

  for (const relation of schema.relations) {
    const sourceTable = schema.tables.find(t => t.id === relation.sourceTableId);
    const targetTable = schema.tables.find(t => t.id === relation.targetTableId);

    if (!sourceTable) {
      errors.push(`Relation ${relation.id}: source table not found`);
    } else {
      const sourceColumn = sourceTable.columns.find(c => c.id === relation.sourceColumnId);
      if (!sourceColumn) {
        errors.push(`Relation ${relation.id}: source column not found in table ${sourceTable.name}`);
      }
    }

    if (!targetTable) {
      errors.push(`Relation ${relation.id}: target table not found`);
    } else {
      const targetColumn = targetTable.columns.find(c => c.id === relation.targetColumnId);
      if (!targetColumn) {
        errors.push(`Relation ${relation.id}: target column not found in table ${targetTable.name}`);
      }
    }
  }

  return errors;
}

export function isValidSchema(schema: SchemaWithRelations): boolean {
  return validateSchema(schema).length === 0;
}

export function validateColumnType(type: string, dialect: DatabaseDialect): boolean {
  const validTypes: Record<DatabaseDialect, string[]> = {
    postgresql: ['bigint', 'bigserial', 'bit', 'bit varying', 'boolean', 'box', 'bytea', 'character', 'character varying', 'cidr', 'circle', 'date', 'double precision', 'inet', 'integer', 'interval', 'json', 'jsonb', 'line', 'lseg', 'macaddr', 'macaddr8', 'money', 'numeric', 'path', 'pg_lsn', 'point', 'polygon', 'real', 'smallint', 'smallserial', 'serial', 'text', 'time', 'timestamp', 'tsquery', 'tsvector', 'txid_snapshot', 'uuid', 'xml'],
    mysql: ['bigint', 'binary', 'bit', 'blob', 'boolean', 'char', 'date', 'datetime', 'decimal', 'double', 'enum', 'float', 'geometry', 'int', 'integer', 'json', 'longblob', 'longtext', 'mediumblob', 'mediumint', 'mediumtext', 'numeric', 'real', 'set', 'smallint', 'text', 'time', 'timestamp', 'tinyblob', 'tinyint', 'tinytext', 'varbinary', 'varchar', 'year'],
    sqlite: ['blob', 'boolean', 'date', 'datetime', 'integer', 'numeric', 'real', 'text', 'time', 'timestamp'],
    mssql: ['bigint', 'binary', 'bit', 'char', 'date', 'datetime', 'datetime2', 'datetimeoffset', 'decimal', 'float', 'geography', 'geometry', 'hierarchyid', 'image', 'int', 'money', 'nchar', 'ntext', 'numeric', 'nvarchar', 'real', 'smalldatetime', 'smallint', 'smallmoney', 'sql_variant', 'text', 'time', 'timestamp', 'tinyint', 'uniqueidentifier', 'varbinary', 'varchar', 'xml'],
    oracle: ['bfile', 'blob', 'char', 'clob', 'date', 'decimal', 'double precision', 'float', 'integer', 'interval day to second', 'interval year to month', 'long', 'long raw', 'nchar', 'nclob', 'number', 'nvarchar2', 'raw', 'real', 'rowid', 'smallint', 'timestamp', 'timestamp with local time zone', 'timestamp with time zone', 'urowid', 'varchar', 'varchar2', 'xmltype'],
    mariadb: ['bigint', 'binary', 'bit', 'blob', 'boolean', 'char', 'date', 'datetime', 'decimal', 'double', 'enum', 'float', 'geometry', 'int', 'integer', 'json', 'longblob', 'longtext', 'mediumblob', 'mediumint', 'mediumtext', 'numeric', 'real', 'set', 'smallint', 'text', 'time', 'timestamp', 'tinyblob', 'tinyint', 'tinytext', 'varbinary', 'varchar', 'year'],
  };

  const baseType = type.toLowerCase().split('(')[0].trim();
  return validTypes[dialect].includes(baseType);
}

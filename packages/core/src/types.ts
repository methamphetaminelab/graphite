export type DatabaseDialect = 'postgresql' | 'mysql' | 'sqlite' | 'mssql' | 'oracle' | 'mariadb';

export interface Schema {
  name: string;
  dialect: DatabaseDialect;
  tables: Table[];
  enums: Enum[];
  notes: Note[];
}

export interface Table {
  id: string;
  name: string;
  schema?: string;
  columns: Column[];
  indexes: Index[];
  color?: string;
  position?: Position;
  note?: string;
}

export interface HybridType {
  base: string;
  args: (string | number)[];
}

export interface Column {
  id: string;
  name: string;
  type: string;
  hybridType?: HybridType;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  note?: string;
  comment?: string;
}

export interface Index {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext' | 'spatial';
}

export interface Enum {
  id: string;
  name: string;
  values: string[];
}

export interface Note {
  id: string;
  content: string;
  position?: Position;
}

export interface Position {
  x: number;
  y: number;
}

export interface Relation {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  onDelete?: 'cascade' | 'set_null' | 'set_default' | 'restrict' | 'no_action';
  onUpdate?: 'cascade' | 'set_null' | 'set_default' | 'restrict' | 'no_action';
}

export interface SchemaWithRelations extends Schema {
  relations: Relation[];
}

export function createEmptySchema(dialect: DatabaseDialect = 'postgresql'): SchemaWithRelations {
  return {
    name: 'new_schema',
    dialect,
    tables: [],
    enums: [],
    notes: [],
    relations: [],
  };
}

export function createTable(name: string, schema?: string): Table {
  return {
    id: generateId(),
    name,
    schema,
    columns: [],
    indexes: [],
    position: { x: 0, y: 0 },
  };
}

export function createColumn(name: string, type: string): Column {
  return {
    id: generateId(),
    name,
    type,
    nullable: true,
    primaryKey: false,
    unique: false,
    autoIncrement: false,
  };
}

export function createEnum(name: string, values: string[] = []): Enum {
  return {
    id: generateId(),
    name,
    values,
  };
}

export function createRelation(
  sourceTableId: string,
  sourceColumnId: string,
  targetTableId: string,
  targetColumnId: string,
  type: Relation['type'] = 'one_to_many'
): Relation {
  return {
    id: generateId(),
    sourceTableId,
    sourceColumnId,
    targetTableId,
    targetColumnId,
    type,
  };
}

function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

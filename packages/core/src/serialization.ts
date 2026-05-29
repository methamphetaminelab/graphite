import type { SchemaWithRelations, Schema, Relation } from './types.js';

export function serializeSchema(schema: SchemaWithRelations): string {
  const data = {
    ...schema,
    version: 1,
  };
  return JSON.stringify(data, null, 2);
}

export function deserializeSchema(json: string): SchemaWithRelations {
  const data = JSON.parse(json);
  
  if (!data.tables) data.tables = [];
  if (!data.enums) data.enums = [];
  if (!data.notes) data.notes = [];
  if (!data.relations) data.relations = [];
  
  return data as SchemaWithRelations;
}

export function schemaToJson(schema: SchemaWithRelations): unknown {
  return {
    name: schema.name,
    dialect: schema.dialect,
    tables: schema.tables.map(table => ({
      id: table.id,
      name: table.name,
      schema: table.schema,
      columns: table.columns.map(col => ({
        id: col.id,
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        defaultValue: col.defaultValue,
        primaryKey: col.primaryKey,
        unique: col.unique,
        autoIncrement: col.autoIncrement,
        note: col.note,
      })),
      indexes: table.indexes,
      color: table.color,
      position: table.position,
      note: table.note,
    })),
    enums: schema.enums,
    notes: schema.notes,
    relations: schema.relations.map(rel => ({
      id: rel.id,
      sourceTableId: rel.sourceTableId,
      sourceColumnId: rel.sourceColumnId,
      targetTableId: rel.targetTableId,
      targetColumnId: rel.targetColumnId,
      type: rel.type,
      onDelete: rel.onDelete,
      onUpdate: rel.onUpdate,
    })),
  };
}

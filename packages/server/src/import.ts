import { Router } from 'express';
import { Schema, SchemaWithRelations, Table, Column, Relation, DatabaseDialect, createEmptySchema } from '@graphite/core';

const router: Router = Router();

interface ImportRequest {
  dialect: DatabaseDialect;
  connection: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    connectionString?: string;
    filename?: string; 
  }
}

async function importPostgreSQL(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  const { Client } = await import('pg');
  const client = new Client({
    host: connection.host || 'localhost',
    port: connection.port || 5432,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    connectionString: connection.connectionString,
    ssl: false,
  });

  try {
    await client.connect();

    const tablesResult = await client.query(`
      SELECT 
        t.table_name,
        t.table_schema
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name
    `);

    const tables: Table[] = [];
    const relations: Relation[] = [];

    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      const tableSchema = tableRow.table_schema;

      const columnsResult = await client.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name, ku.table_name, ku.table_schema
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name 
          AND c.table_name = pk.table_name 
          AND c.table_schema = pk.table_schema
        WHERE c.table_name = $1 AND c.table_schema = $2
        ORDER BY c.ordinal_position
      `, [tableName, tableSchema]);

      const columns: Column[] = columnsResult.rows.map((col: any) => ({
        id: `col-${tableName}-${col.column_name}`,
        name: col.column_name,
        type: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
        primaryKey: col.is_primary_key,
        nullable: col.is_nullable !== 'NO',
        defaultValue: col.column_default || undefined,
        unique: false,
        autoIncrement: false,
      }));

      const fkResult = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = $2
      `, [tableName, tableSchema]);

      for (const fk of fkResult.rows) {
        relations.push({
          id: `rel-${fk.constraint_name}`,
          sourceTableId: `table-${tableSchema}-${tableName}`,
          sourceColumnId: `col-${tableName}-${fk.column_name}`,
          targetTableId: `table-${tableSchema}-${fk.foreign_table_name}`,
          targetColumnId: `col-${fk.foreign_table_name}-${fk.foreign_column_name}`,
          type: 'one_to_many',
        });
      }

      tables.push({
        id: `table-${tableSchema}-${tableName}`,
        name: tableName,
        schema: tableSchema,
        columns,
        indexes: [],
      });
    }

    return {
      name: connection.database || 'imported',
      dialect: 'postgresql',
      tables,
      relations,
      enums: [],
      notes: [],
    }
  } finally {
    await client.end();
  }
}

async function importMySQL(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection({
    host: connection.host || 'localhost',
    port: connection.port || 3306,
    database: connection.database,
    user: connection.username,
    password: connection.password,
  });

  try {
    
    const [tablesResult] = await conn.execute(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [connection.database || '']
    ) as any[];

    const tables: Table[] = [];
    const relations: Relation[] = [];

    for (const tableRow of tablesResult) {
      const tableName = tableRow.table_name;

      const [columnsResult] = await conn.execute(
        `SELECT 
          column_name, data_type, is_nullable, column_default,
          character_maximum_length, numeric_precision, numeric_scale,
          extra, column_key
        FROM information_schema.columns 
        WHERE table_name = ? AND table_schema = ?
        ORDER BY ordinal_position`,
        [tableName, connection.database]
      ) as any[];

      const columns: Column[] = columnsResult.map((col: any) => ({
        id: `col-${tableName}-${col.column_name}`,
        name: col.column_name,
        type: col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : ''),
        primaryKey: col.column_key === 'PRI',
        autoIncrement: col.extra === 'auto_increment',
        nullable: col.is_nullable !== 'NO',
        defaultValue: col.column_default || undefined,
        unique: false,
      }));

      const [fkResult] = await conn.execute(
        `SELECT
          kcu.column_name,
          kcu.referenced_table_name,
          kcu.referenced_column_name,
          kcu.constraint_name
        FROM information_schema.key_column_usage kcu
        WHERE kcu.table_name = ? 
          AND kcu.table_schema = ?
          AND kcu.referenced_table_name IS NOT NULL`,
        [tableName, connection.database]
      ) as any[];

      for (const fk of fkResult) {
        relations.push({
          id: `rel-${fk.constraint_name}`,
          sourceTableId: `table-${tableName}`,
          sourceColumnId: `col-${tableName}-${fk.column_name}`,
          targetTableId: `table-${fk.referenced_table_name}`,
          targetColumnId: `col-${fk.referenced_table_name}-${fk.referenced_column_name}`,
          type: 'one_to_many',
        });
      }

      tables.push({
        id: `table-${tableName}`,
        name: tableName,
        columns,
        indexes: [],
      });
    }

    return {
      name: connection.database || 'imported',
      dialect: 'mysql',
      tables,
      relations,
      enums: [],
      notes: [],
    };
  } finally {
    await conn.end();
  }
}

async function importSQLite(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  const Database = await import('better-sqlite3');
  const db = new Database.default(connection.filename || ':memory:');

  try {
    
    const tablesResult = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    const tables: Table[] = [];
    const relations: Relation[] = [];

    for (const tableRow of tablesResult) {
      const tableName = tableRow.name;

      const columnsResult = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];

      const columns: Column[] = columnsResult.map((col: any) => ({
        id: `col-${tableName}-${col.name}`,
        name: col.name,
        type: col.type,
        primaryKey: col.pk === 1,
        nullable: col.notnull !== 1,
        defaultValue: col.dflt_value || undefined,
        unique: false,
        autoIncrement: false,
      }));

      const fkResult = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as any[];

      for (const fk of fkResult) {
        relations.push({
          id: `rel-${tableName}-${fk.id}`,
          sourceTableId: `table-${tableName}`,
          sourceColumnId: `col-${tableName}-${fk.from}`,
          targetTableId: `table-${fk.table}`,
          targetColumnId: `col-${fk.table}-${fk.to}`,
          type: 'one_to_many',
        });
      }

      tables.push({
        id: `table-${tableName}`,
        name: tableName,
        columns,
        indexes: [],
      });
    }

    return {
      name: connection.filename || 'imported',
      dialect: 'sqlite',
      tables,
      relations,
      enums: [],
      notes: [],
    };
  } finally {
    db.close();
  }
}

async function importMSSQL(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  const mssql = await import('mssql');
  const sql = mssql.default || mssql;
  const pool = new (sql as any).ConnectionPool({
    server: connection.host || 'localhost',
    port: connection.port || 1433,
    database: connection.database,
    user: connection.username,
    password: connection.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });
  await pool.connect();

  try {
    
    const tablesResult = await pool.request().query(
      `SELECT TABLE_NAME, TABLE_SCHEMA 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_SCHEMA, TABLE_NAME`
    );

    const tables: Table[] = [];
    const relations: Relation[] = [];

    for (const tableRow of tablesResult.recordset) {
      const tableName = tableRow.TABLE_NAME;
      const tableSchema = tableRow.TABLE_SCHEMA;

      const columnsResult = await pool.request()
        .input('tableName', (sql as any).NVarChar, tableName)
        .input('tableSchema', (sql as any).NVarChar, tableSchema)
        .query(`
          SELECT 
            c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT,
            c.CHARACTER_MAXIMUM_LENGTH,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY
          FROM INFORMATION_SCHEMA.COLUMNS c
          LEFT JOIN (
            SELECT ku.COLUMN_NAME, ku.TABLE_NAME, ku.TABLE_SCHEMA
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
              ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME 
            AND c.TABLE_NAME = pk.TABLE_NAME 
            AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
          WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @tableSchema
          ORDER BY c.ORDINAL_POSITION
        `);

      const columns: Column[] = columnsResult.recordset.map((col: any) => ({
        id: `col-${tableName}-${col.COLUMN_NAME}`,
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE + (col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''),
        primaryKey: col.IS_PRIMARY_KEY === 1,
        nullable: col.IS_NULLABLE !== 'NO',
        defaultValue: col.COLUMN_DEFAULT || undefined,
        unique: false,
        autoIncrement: false,
      }));

      const fkResult = await pool.request()
        .input('tableName', (sql as any).NVarChar, tableName)
        .query(`
          SELECT
            fk.name AS constraint_name,
            c.name AS column_name,
            rt.name AS referenced_table,
            rc.name AS referenced_column
          FROM sys.foreign_keys fk
          INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
          INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
          INNER JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
          INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
          INNER JOIN sys.tables pt ON fk.parent_object_id = pt.object_id
          WHERE pt.name = @tableName
        `);

      for (const fk of fkResult.recordset) {
        relations.push({
          id: `rel-${fk.constraint_name}`,
          sourceTableId: `table-${tableSchema}-${tableName}`,
          sourceColumnId: `col-${tableName}-${fk.column_name}`,
          targetTableId: `table-${tableSchema}-${fk.referenced_table}`,
          targetColumnId: `col-${fk.referenced_table}-${fk.referenced_column}`,
          type: 'one_to_many',
        });
      }

      tables.push({
        id: `table-${tableSchema}-${tableName}`,
        name: tableName,
        schema: tableSchema,
        columns,
        indexes: [],
      });
    }

    return {
      name: connection.database || 'imported',
      dialect: 'mssql',
      tables,
      relations,
      enums: [],
      notes: [],
    };
  } finally {
    await pool.close();
  }
}

async function importOracle(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  const oracledb = await import('oracledb');
  const conn = await oracledb.getConnection({
    connectString: connection.connectionString || `${connection.host}:${connection.port || 1521}/${connection.database}`,
    user: connection.username,
    password: connection.password,
  });

  try {
    
    const tablesResult = await conn.execute(
      `SELECT table_name FROM user_tables ORDER BY table_name`
    );

    const tables: Table[] = [];
    const relations: Relation[] = [];

    for (const tableRow of tablesResult.rows as any[]) {
      const tableName = tableRow[0];

      const columnsResult = await conn.execute(
        `SELECT 
          column_name, data_type, data_length, nullable, data_default
        FROM user_tab_columns 
        WHERE table_name = :tableName
        ORDER BY column_id`,
        [tableName]
      );

      const pkResult = await conn.execute(
        `SELECT column_name 
         FROM user_cons_columns 
         WHERE constraint_name IN (
           SELECT constraint_name 
           FROM user_constraints 
           WHERE table_name = :tableName AND constraint_type = 'P'
         )`,
        [tableName]
      );
      const pkColumns = new Set((pkResult.rows as any[]).map((row) => row[0]));

      const columns: Column[] = (columnsResult.rows as any[]).map((col: any) => ({
        id: `col-${tableName}-${col[0]}`,
        name: col[0],
        type: col[1] + (col[2] ? `(${col[2]})` : ''),
        primaryKey: pkColumns.has(col[0]),
        nullable: col[3] !== 'N',
        defaultValue: col[4] || undefined,
        unique: false,
        autoIncrement: false,
      }));

      const fkResult = await conn.execute(
        `SELECT
          a.column_name,
          c_pk.table_name AS referenced_table,
          b.column_name AS referenced_column
        FROM user_cons_columns a
        JOIN user_constraints c ON a.constraint_name = c.constraint_name
        JOIN user_constraints c_pk ON c.r_constraint_name = c_pk.constraint_name
        JOIN user_cons_columns b ON b.constraint_name = c_pk.constraint_name
        WHERE c.constraint_type = 'R' AND c.table_name = :tableName`,
        [tableName]
      );

      for (const fk of fkResult.rows as any[]) {
        relations.push({
          id: `rel-${tableName}-${fk[0]}`,
          sourceTableId: `table-${tableName}`,
          sourceColumnId: `col-${tableName}-${fk[0]}`,
          targetTableId: `table-${fk[1]}`,
          targetColumnId: `col-${fk[1]}-${fk[2]}`,
          type: 'one_to_many',
        });
      }

      tables.push({
        id: `table-${tableName}`,
        name: tableName,
        columns,
        indexes: [],
      });
    }

    return {
      name: connection.username || 'imported',
      dialect: 'oracle',
      tables,
      relations,
      enums: [],
      notes: [],
    };
  } finally {
    await conn.close();
  }
}

async function importMariaDB(connection: ImportRequest['connection']): Promise<SchemaWithRelations> {
  
  return importMySQL(connection);
}

const importFunctions: Record<DatabaseDialect, (connection: ImportRequest['connection']) => Promise<SchemaWithRelations>> = {
  postgresql: importPostgreSQL,
  mysql: importMySQL,
  sqlite: importSQLite,
  mssql: importMSSQL,
  oracle: importOracle,
  mariadb: importMariaDB,
};

router.post('/', async (req, res) => {
  const { dialect, connection } = req.body as ImportRequest;

  if (!dialect || !connection) {
    return res.status(400).json({ error: 'Missing dialect or connection details' });
  }

  const importFn = importFunctions[dialect];
  if (!importFn) {
    return res.status(400).json({ error: `Unsupported dialect: ${dialect}` });
  }

  try {
    const schema = await importFn(connection);
    res.json(schema);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      error: 'Failed to import database schema',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

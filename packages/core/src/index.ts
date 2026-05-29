export * from './types.js';
export * from './validation.js';
export * from './serialization.js';
export * from './dbml.js';
export { createEnum } from './types.js';

export { generatePostgreSQL } from './sql-generators/postgresql.js';
export { generateMySQL } from './sql-generators/mysql.js';
export { generateSQLite } from './sql-generators/sqlite.js';
export { generateMSSQL } from './sql-generators/mssql.js';
export { generateOracle } from './sql-generators/oracle.js';
export { generateMariaDB } from './sql-generators/mariadb.js';

import type { SchemaWithRelations, DatabaseDialect } from './types.js';
import { generatePostgreSQL } from './sql-generators/postgresql.js';
import { generateMySQL } from './sql-generators/mysql.js';
import { generateSQLite } from './sql-generators/sqlite.js';
import { generateMSSQL } from './sql-generators/mssql.js';
import { generateOracle } from './sql-generators/oracle.js';
import { generateMariaDB } from './sql-generators/mariadb.js';

export function generateSQL(schema: SchemaWithRelations, dialect: DatabaseDialect): string {
  switch (dialect) {
    case 'postgresql': return generatePostgreSQL(schema);
    case 'mysql': return generateMySQL(schema);
    case 'sqlite': return generateSQLite(schema);
    case 'mssql': return generateMSSQL(schema);
    case 'oracle': return generateOracle(schema);
    case 'mariadb': return generateMariaDB(schema);
    default: throw new Error(`Unsupported dialect: ${dialect}`);
  }
}

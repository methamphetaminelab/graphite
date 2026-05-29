declare module 'pg' {
  export class Client {
    constructor(config: any);
    connect(): Promise<void>;
    query(sql: string, values?: any[]): Promise<{ rows: any[] }>;
    end(): Promise<void>;
  }
}

declare module 'better-sqlite3' {
  export default class Database {
    constructor(filename: string);
    prepare(sql: string): Statement;
    close(): void;
  }
  
  export class Statement {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number };
  }
}

declare module 'mssql' {
  export function connect(config: any): Promise<any>;
  export const Request: any;
  export default { connect, Request };
}

declare module 'oracledb' {
  export function getConnection(config: any): Promise<any>;
  export default { getConnection };
}

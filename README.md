# Graphite

Self-hosted web application for database architecture design — an open-source alternative to dbdiagram.io and drawsql.app.

## Features

- **Visual Editor**: Drag-and-drop tables and columns with automatic relation rendering
- **Text DSL**: Write DBML and see changes reflected in real-time in the visual editor
- **Bidirectional Sync**: Edit visually or via text — both stay in sync
- **Multi-Database Support**: PostgreSQL, MySQL, SQLite, MSSQL, Oracle, MariaDB
- **Import from Database**: Connect to existing databases and import their schema
- **Export Formats**: SQL DDL, DBML, JSON, PNG, SVG, PDF
- **Auto-Layout**: Automatic layered graph layout for clean diagram organization
- **Multi-Select & Box Selection**: Select multiple tables via box selection or Ctrl+click
- **Copy & Paste**: Duplicate tables with Ctrl+C / Ctrl+V, including context menu support
- **Canvas Context Menu**: Right-click on canvas for quick actions — duplicate, delete, change color, select by color
- **Schema Verification**: Real-time validation — detects missing primary keys, orphaned tables, and relation cycles
- **Keyboard Shortcuts**: Ctrl+A (select all), Ctrl+C/V (copy/paste), Delete (remove), Escape (deselect)
- **Zero Authentication**: No login required — open access, deploy anywhere
- **Self-Hosted**: Single Docker image with everything included

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS + @xyflow/react
- **State Management**: Zustand
- **DSL Editor**: CodeMirror 6 with SQL syntax highlighting
- **UI Primitives**: Radix UI (dialog, dropdown, tabs, tooltip)
- **Export**: html-to-image (PNG/SVG), jsPDF (PDF)
- **Backend**: Node.js + Express (import API only)
- **Monorepo**: pnpm workspaces
- **Testing**: Playwright

## Quick Start

### Docker (Recommended)

```bash
docker build -t graphite .
docker run -p 3001:3001 graphite
```

Open http://localhost:3001

### Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
pnpm dev
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + A` | Select all tables |
| `Ctrl + C` | Copy selected tables |
| `Ctrl + V` | Paste tables |
| `Delete` | Remove selected tables |
| `Escape` | Deselect all / close dialogs |

## Project Structure

```
packages/
  core/      # Pure TypeScript — types, validation, serialization, SQL generators, DBML parser, SQL parser
  editor/    # Next.js app — visual editor, DSL editor, UI components, export dialogs
  server/    # Express server — database import API + static file serving
```

## API

### Health Check
```
GET /api/health
```

### Import Database Schema
```
POST /api/import
Content-Type: application/json

{
  "dialect": "postgresql",
  "connection": {
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "username": "user",
    "password": "pass"
  }
}
```

Supported dialects: `postgresql`, `mysql`, `sqlite`, `mssql`, `oracle`, `mariadb`

## Export Formats

- **SQL DDL**: Generate CREATE TABLE statements for any supported database
- **DBML**: Database Markup Language for text-based schema definition
- **JSON**: Machine-readable schema representation
- **PNG/SVG**: Visual diagram exports via browser rendering
- **PDF**: Printable diagram export

## License

MIT

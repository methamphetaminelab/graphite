import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import importRouter from './import.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/import', importRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from editor dist
const editorDistPath = path.resolve(__dirname, '../../editor/dist');
app.use(express.static(editorDistPath));

// Fallback to index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(editorDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

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

app.use('/api/import', importRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const editorDistPath = path.resolve(__dirname, '../../editor/dist');
app.use(express.static(editorDistPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(editorDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

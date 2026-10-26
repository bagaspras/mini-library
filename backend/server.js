import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './src/config/database.js';
import authRoutes from './src/routes/auth.routes.js';
import booksRoutes from './src/routes/books.routes.js';
import categoriesRoutes from './src/routes/categories.routes.js';
import membersRoutes from './src/routes/members.routes.js';
import loansRoutes from './src/routes/loans.routes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const root = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diatur di file .env');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET harus minimal 32 karakter. Buat dengan: openssl rand -hex 32');
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin tidak diizinkan oleh CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Let the frontend embed book cover images from the API's different local port.
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || 'uploads/covers');
app.use('/uploads/covers', helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }), express.static(uploadDir));

app.get('/api/v1/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database gagal:', error.message);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/books', booksRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/members', membersRoutes);
app.use('/api/v1/loans', loansRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error('API error:', err.message);
  if (res.headersSent) return next(err);
  if (err.message.startsWith('Origin tidak diizinkan oleh CORS:')) {
    return res.status(403).json({ message: 'Origin frontend tidak diizinkan oleh CORS' });
  }
  const status = err.status || 500;
  res.status(status).json({
    message: status < 500 ? err.message : 'Terjadi kesalahan pada server',
  });
});

async function startServer() {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`API aktif: http://127.0.0.1:${PORT}`);
      console.log('Frontend diizinkan:');
      allowedOrigins.forEach((origin) => console.log(`- ${origin}`));
    });
  } catch (error) {
    console.error('Koneksi PostgreSQL gagal:', error.message);
    process.exit(1);
  }
}

startServer();

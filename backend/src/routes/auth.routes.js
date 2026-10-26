import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  register,
  login,
  me,
  logout
} from '../controllers/auth.controller.js';

import { authenticate } from '../middleware/auth.js';

const router = Router();

// Batasi percobaan login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak percobaan login. Coba lagi nanti.'
  }
});

// Batasi registrasi untuk mencegah penyalahgunaan
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    message: 'Terlalu banyak percobaan registrasi. Coba lagi nanti.'
  }
});

// Register akun member
router.post('/register', registerLimiter, register);

// Login
router.post('/login', loginLimiter, login);

// Cek user yang sedang login
router.get('/me', authenticate, me);

// Logout
router.post('/logout', authenticate, logout);

export default router;

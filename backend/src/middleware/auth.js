import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token autentikasi diperlukan' });
  }

  const token = header.slice(7).trim();
  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      console.error('JWT_SECRET belum diatur atau terlalu pendek');
      return res.status(500).json({ message: 'Konfigurasi autentikasi server belum benar' });
    }
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!result.rowCount) return res.status(401).json({ message: 'Akun tidak ditemukan atau sudah tidak aktif' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token sudah kedaluwarsa, silakan login kembali' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Token tidak valid' });
    next(err);
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki izin untuk melakukan tindakan ini' });
    }
    next();
  };
}

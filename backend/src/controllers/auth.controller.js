import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { randomBytes } from 'node:crypto';

export async function login(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' });

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = $1',
      [email]
    );
    if (!result.rowCount) return res.status(401).json({ message: 'Email atau password salah' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Email atau password salah' });

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) return res.status(500).json({ message: 'JWT_SECRET server belum dikonfigurasi dengan benar' });

    const expiresIn = process.env.JWT_EXPIRES_IN || '2h';
    const token = jwt.sign(
      { role: user.role },
      secret,
      { subject: String(user.id), expiresIn, algorithm: 'HS256' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { next(err); }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function logout(req, res) {
  // JWT stateless: hapus token dari client. Untuk invalidasi server-side,
  // gunakan session atau tabel token blacklist.
  res.json({ message: 'Logout berhasil. Hapus token dari penyimpanan client.' });
}

export async function register(req, res, next) {
    const name = typeof req.body.name === 'string'
        ? req.body.name.trim()
        : '';

    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password = typeof req.body.password === 'string'
        ? req.body.password
        : '';

    if (name.length < 2 || name.length > 120) {
        return res.status(400).json({
            message: 'Nama harus terdiri dari 2–120 karakter'
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            message: 'Format email tidak valid'
        });
    }

    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({
            message: 'Password harus minimal 12 karakter dan maksimal 72 byte'
        });
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        const existingUser = await client.query(
            'SELECT id FROM users WHERE LOWER(email) = $1',
            [email]
        );

        if (existingUser.rowCount) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(409).json({
                message: 'Email sudah terdaftar'
            });
        }

        const existingMember = await client.query(
            `SELECT id FROM members
             WHERE email IS NOT NULL AND LOWER(email) = $1`,
            [email]
        );

        if (existingMember.rowCount) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(409).json({
                message: 'Email sudah tercatat sebagai anggota. Hubungi pengelola untuk menghubungkan akun.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'member')
             RETURNING id, name, email, role`,
            [name, email, passwordHash]
        );

        const memberCode =
            `MBR-${randomBytes(6).toString('hex').toUpperCase()}`;

        const memberResult = await client.query(
            `INSERT INTO members
                (user_id, member_code, name, email, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING id, user_id, member_code, name, email, status`,
            [
                userResult.rows[0].id,
                memberCode,
                name,
                email
            ]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(201).json({
            message: 'Registrasi berhasil. Silakan login.',
            user: userResult.rows[0],
            member: memberResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK').catch(() => {});
        }

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Email atau kode anggota sudah digunakan'
            });
        }

        next(error);
    } finally {
        client.release();
    }
}
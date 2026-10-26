import pool from '../config/database.js';

export async function getBooks(req, res, next) {
  try {
    const q = await pool.query(`
      SELECT b.*, c.name AS category_name
      FROM books b
      LEFT JOIN categories c ON c.id = b.category_id
      ORDER BY b.id DESC
    `);
    res.json({ data: q.rows });
  } catch (e) { next(e); }
}

export async function getBookById(req, res, next) {
  try {
    const q = await pool.query(
      'SELECT b.*, c.name AS category_name FROM books b LEFT JOIN categories c ON c.id = b.category_id WHERE b.id = $1',
      [req.params.id]
    );
    if (!q.rowCount) return res.status(404).json({ message: 'Buku tidak ditemukan' });
    res.json({ data: q.rows[0] });
  } catch (e) { next(e); }
}

export async function createBook(req, res, next) {
  try {
    const {
      category_id = null, isbn = null, title, author, publisher = null,
      publication_year = null, description = null, total_stock = 0,
    } = req.body;
    if (typeof title !== 'string' || !title.trim() || typeof author !== 'string' || !author.trim()) {
      return res.status(400).json({ message: 'Judul dan penulis wajib diisi' });
    }
    const stock = Number(total_stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: 'total_stock harus bilangan bulat >= 0' });
    }
    const year = publication_year === '' || publication_year == null ? null : Number(publication_year);
    if (year !== null && (!Number.isInteger(year) || year < 0 || year > 9999)) {
      return res.status(400).json({ message: 'Tahun terbit tidak valid' });
    }

    const coverImage = req.file ? `/uploads/covers/${req.file.filename}` : null;
    const q = await pool.query(`
      INSERT INTO books(category_id, isbn, title, author, publisher, publication_year,
                        description, cover_image, total_stock, available_stock)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
      RETURNING *
    `, [category_id || null, isbn || null, title.trim(), author.trim(), publisher || null,
      year, description || null, coverImage, stock]);
    res.status(201).json({ message: 'Buku berhasil ditambahkan', data: q.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'ISBN sudah digunakan' });
    if (e.code === '23503') return res.status(400).json({ message: 'Kategori tidak ditemukan' });
    next(e);
  }
}

export async function updateBook(req, res, next) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'ID tidak valid' });
    await client.query('BEGIN');
    const oldq = await client.query('SELECT * FROM books WHERE id=$1 FOR UPDATE', [id]);
    if (!oldq.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }

    const old = oldq.rows[0];
    const body = { ...req.body };
    // Keep the existing cover on metadata-only edits; replace it only when a new file is uploaded.
    if (req.file) body.cover_image = `/uploads/covers/${req.file.filename}`;

    const keys = ['category_id', 'isbn', 'title', 'author', 'publisher', 'publication_year', 'description', 'cover_image'];
    const sets = [];
    const vals = [];
    for (const key of keys) {
      if (!Object.hasOwn(body, key)) continue;
      let value = body[key];
      if (['title', 'author'].includes(key)) {
        if (typeof value !== 'string' || !value.trim()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `${key} wajib diisi` });
        }
        value = value.trim();
      }
      if (['category_id', 'publication_year'].includes(key)) value = value === '' || value === null ? null : Number(value);
      if (['isbn', 'publisher', 'description', 'cover_image'].includes(key)) value = value || null;
      vals.push(value);
      sets.push(`${key}=$${vals.length}`);
    }

    if (Object.hasOwn(body, 'total_stock')) {
      const total = Number(body.total_stock);
      const borrowed = Number(old.total_stock) - Number(old.available_stock);
      if (!Number.isInteger(total) || total < borrowed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Stok total minimal ${borrowed}` });
      }
      vals.push(total); sets.push(`total_stock=$${vals.length}`);
      vals.push(total - borrowed); sets.push(`available_stock=$${vals.length}`);
    }
    if (!sets.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Tidak ada perubahan' });
    }
    vals.push(id);
    const q = await client.query(
      `UPDATE books SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,
      vals
    );
    await client.query('COMMIT');
    res.json({ message: 'Buku diperbarui', data: q.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.code === '23505') return res.status(409).json({ message: 'ISBN sudah digunakan' });
    if (e.code === '23503') return res.status(400).json({ message: 'Kategori tidak ditemukan' });
    next(e);
  } finally {
    client.release();
  }
}

export async function deleteBook(req, res, next) {
  try {
    const q = await pool.query('DELETE FROM books WHERE id=$1', [req.params.id]);
    if (!q.rowCount) return res.status(404).json({ message: 'Buku tidak ditemukan' });
    res.json({ message: 'Buku berhasil dihapus' });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ message: 'Buku memiliki riwayat peminjaman dan tidak bisa dihapus' });
    next(e);
  }
}

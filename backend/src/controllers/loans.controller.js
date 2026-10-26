
import pool from '../config/database.js';

// GET: Menampilkan semua transaksi peminjaman
export async function getLoans(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT
                l.id,
                l.member_id,
                m.member_code,
                m.name AS member_name,
                l.user_id,
                l.loan_date,
                l.due_date,
                l.return_date,
                l.status,
                l.notes,
                l.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'book_id', b.id,
                            'title', b.title,
                            'author', b.author,
                            'quantity', li.quantity
                        )
                    ) FILTER (WHERE li.id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM loans l
            JOIN members m ON m.id = l.member_id
            LEFT JOIN loan_items li ON li.loan_id = l.id
            LEFT JOIN books b ON b.id = li.book_id
            GROUP BY l.id, m.id
            ORDER BY l.id DESC
        `);

        res.json({
            message: 'Data peminjaman berhasil diambil',
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
}

// POST: Membuat transaksi peminjaman dan mengurangi stok
export async function createLoan(req, res, next) {
    const { member_id, due_date, notes, items } = req.body;

    if (
        !Number.isInteger(Number(member_id)) ||
        Number(member_id) <= 0 ||
        !due_date ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            message: 'member_id, due_date, dan minimal satu buku wajib diisi'
        });
    }

    const normalizedItems = [];

    for (const item of items) {
        const bookId = Number(item.book_id);
        const quantity = Number(item.quantity ?? 1);

        if (
            !Number.isSafeInteger(bookId) ||
            bookId <= 0 ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            return res.status(400).json({
                message: 'book_id dan quantity harus berupa bilangan bulat positif'
            });
        }

        normalizedItems.push({ book_id: bookId, quantity });
    }

    // Buku yang sama tidak boleh muncul dua kali dalam satu transaksi.
    const quantities = new Map();

    for (const item of normalizedItems) {
        quantities.set(
            item.book_id,
            (quantities.get(item.book_id) || 0) + item.quantity
        );
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        const member = await client.query(
            `SELECT id FROM members
             WHERE id = $1 AND status = 'active'
             FOR SHARE`,
            [Number(member_id)]
        );

        if (member.rowCount === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(400).json({
                message: 'Anggota tidak ditemukan atau tidak aktif'
            });
        }

        const loan = await client.query(
            `INSERT INTO loans (member_id, user_id, due_date, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                Number(member_id),
                req.user?.id ?? null,
                due_date,
                notes ?? null
            ]
        );

        const loanId = loan.rows[0].id;

        for (const [bookId, quantity] of quantities) {
            // Update stok hanya jika stok tersedia mencukupi.
            const stock = await client.query(
                `UPDATE books
                 SET available_stock = available_stock - $1,
                     updated_at = NOW()
                 WHERE id = $2
                   AND available_stock >= $1
                 RETURNING id`,
                [quantity, bookId]
            );

            if (stock.rowCount === 0) {
                const exists = await client.query(
                    'SELECT id FROM books WHERE id = $1',
                    [bookId]
                );

                throw new Error(
                    exists.rowCount === 0
                        ? `Buku dengan ID ${bookId} tidak ditemukan`
                        : `Stok buku ID ${bookId} tidak mencukupi`
                );
            }

            await client.query(
                `INSERT INTO loan_items (loan_id, book_id, quantity)
                 VALUES ($1, $2, $3)`,
                [loanId, bookId, quantity]
            );
        }

        await client.query('COMMIT');
        transactionStarted = false;

        res.status(201).json({
            message: 'Peminjaman buku berhasil ditambahkan',
            data: {
                ...loan.rows[0],
                items: [...quantities].map(([book_id, quantity]) => ({
                    book_id,
                    quantity
                }))
            }
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK').catch(() => {});
        }

        if (
            error.message.startsWith('Buku dengan ID ') ||
            error.message.startsWith('Stok buku ID ')
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        next(error);
    } finally {
        client.release();
    }
}

// PATCH: Mengembalikan seluruh buku dalam transaksi
export async function returnLoan(req, res, next) {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        const loan = await client.query(
            `SELECT id, status
             FROM loans
             WHERE id = $1
             FOR UPDATE`,
            [req.params.id]
        );

        if (loan.rowCount === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(404).json({
                message: 'Transaksi peminjaman tidak ditemukan'
            });
        }

        if (loan.rows[0].status !== 'borrowed') {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(400).json({
                message: 'Transaksi ini sudah dikembalikan'
            });
        }

        const items = await client.query(
            `SELECT book_id, quantity
             FROM loan_items
             WHERE loan_id = $1`,
            [req.params.id]
        );

        for (const item of items.rows) {
            await client.query(
                `UPDATE books
                 SET available_stock = available_stock + $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [item.quantity, item.book_id]
            );
        }

        const updated = await client.query(
            `UPDATE loans
             SET status = 'returned',
                 return_date = CURRENT_DATE,
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        res.json({
            message: 'Buku berhasil dikembalikan',
            data: updated.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK').catch(() => {});
        }

        next(error);
    } finally {
        client.release();
    }
}

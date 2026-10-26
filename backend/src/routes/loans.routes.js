import { Router } from 'express';

import {
    getLoans,
    createLoan,
    returnLoan
} from '../controllers/loans.controller.js';

const router = Router();

// Menampilkan semua peminjaman
router.get('/', getLoans);

// Menambahkan peminjaman baru
router.post('/', createLoan);

// Mencatat pengembalian buku
router.patch('/:id/return', returnLoan);

export default router;

import { Router } from 'express';
import * as c from '../controllers/books.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadCover } from '../middleware/upload-cover.js';

const r = Router();
r.get('/', authenticate, c.getBooks);
r.get('/:id', authenticate, c.getBookById);
r.post('/', authenticate, authorize('admin', 'staff'), uploadCover, c.createBook);
r.patch('/:id', authenticate, authorize('admin', 'staff'), uploadCover, c.updateBook);
r.delete('/:id', authenticate, authorize('admin'), c.deleteBook);
export default r;

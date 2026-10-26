import { Router } from 'express';
import * as c from '../controllers/categories.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const r=Router();
r.get('/',authenticate,c.getCategories); r.get('/:id',authenticate,c.getCategoryById);
r.post('/',authenticate,authorize('admin','staff'),c.createCategory);
r.patch('/:id',authenticate,authorize('admin','staff'),c.updateCategory);
r.delete('/:id',authenticate,authorize('admin'),c.deleteCategory);
export default r;

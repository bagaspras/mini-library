import { Router } from 'express';
import * as c from '../controllers/members.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
const r=Router();
r.get('/',authenticate,c.getMembers); r.get('/:id',authenticate,c.getMemberById);
r.post('/',authenticate,authorize('admin','staff'),c.createMember);
r.patch('/:id',authenticate,authorize('admin','staff'),c.updateMember);
r.delete('/:id',authenticate,authorize('admin'),c.deleteMember);
export default r;

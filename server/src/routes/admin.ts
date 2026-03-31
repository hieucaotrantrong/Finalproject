import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { adminAuth } from '../middleware/adminAuth';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser
} from '../controllers/user.controller';

const router = Router();

/* ---------------------------------------------
   FIX EXPRESS TYPESCRIPT RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*--------------------------------------------------
  Quản lý người dùng
--------------------------------------------------*/
router.get('/users', adminAuth, asyncHandler(getAllUsers));
router.get('/users/:id', adminAuth, asyncHandler(getUserById));
router.post('/users', adminAuth, asyncHandler(createUser));
router.put('/users/:id', adminAuth, asyncHandler(updateUser));
router.delete('/users/:id', adminAuth, asyncHandler(deleteUser));

export default router;

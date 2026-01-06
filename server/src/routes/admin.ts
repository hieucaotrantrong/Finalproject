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
 🧾 Lấy danh sách yêu cầu nạp tiền
--------------------------------------------------*/
router.get('/deposits', adminAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT dr.*, u.email AS user_email
            FROM deposit_requests dr
            JOIN users u ON dr.user_id = u.id
            ORDER BY dr.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Lỗi lấy danh sách nạp tiền:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách nạp tiền' });
    }
}));

/*--------------------------------------------------
  Duyệt yêu cầu nạp tiền (Transaction PGSQL)
--------------------------------------------------*/
router.put('/deposits/:id/approve', adminAuth, asyncHandler(async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const pending = await client.query(
            `SELECT * FROM deposit_requests WHERE id = $1 AND status = 'pending'`,
            [id]
        );

        if (pending.rows.length === 0) {
            client.release();
            res.status(404).json({ error: "Không tìm thấy yêu cầu hoặc đã xử lý" });
            return;
        }

        const deposit = pending.rows[0];

        await client.query("BEGIN");

        await client.query(
            `UPDATE deposit_requests SET status = 'approved' WHERE id = $1`,
            [id]
        );

        await client.query(
            `INSERT INTO wallets (user_id, balance)
             VALUES ($1, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [deposit.user_id]
        );

        await client.query(
            `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
            [deposit.amount, deposit.user_id]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: `Đã duyệt yêu cầu nạp tiền cho user_id=${deposit.user_id}`
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ error: "Lỗi khi xử lý duyệt nạp tiền" });
    } finally {
        client.release();
    }
}));

/*--------------------------------------------------
  Từ chối yêu cầu nạp tiền
--------------------------------------------------*/
router.put('/deposits/:id/reject', adminAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await pool.query(
            `UPDATE deposit_requests 
             SET status = 'rejected' 
             WHERE id = $1 AND status = 'pending'`,
            [id]
        );

        res.json({ success: true, message: "Đã từ chối yêu cầu nạp tiền" });
    } catch (error) {
        console.error("❌ Lỗi từ chối yêu cầu:", error);
        res.status(500).json({ error: "Lỗi server khi từ chối yêu cầu" });
    }
}));

/*--------------------------------------------------
  Quản lý người dùng
--------------------------------------------------*/
router.get('/users', adminAuth, asyncHandler(getAllUsers));
router.get('/users/:id', adminAuth, asyncHandler(getUserById));
router.post('/users', adminAuth, asyncHandler(createUser));
router.put('/users/:id', adminAuth, asyncHandler(updateUser));
router.delete('/users/:id', adminAuth, asyncHandler(deleteUser));

export default router;

import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
  Lấy thông báo theo email
-----------------------------------*/
router.get('/:email', asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM notifications
             WHERE user_email = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [req.params.email]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));

/*----------------------------------
   Đánh dấu đã đọc thông báo
-----------------------------------*/
router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
    try {
        await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE
             WHERE id = $1`,
            [req.params.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));


export default router;

import { Router, Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
Get all support requests
-----------------------------------*/
const getAllRequests = asyncHandler(async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM support_requests ORDER BY created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách hỗ trợ:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

/*----------------------------------
Reply to a support request
-----------------------------------*/
const replyToRequest = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        // Lấy thông tin support request
        const result = await pool.query(
            `SELECT email, topic FROM support_requests WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy yêu cầu hỗ trợ' });
            return;
        }

        const request = result.rows[0];

        // Cập nhật phản hồi
        await pool.query(
            `UPDATE support_requests 
             SET reply = $1, status = 'replied', replied_at = NOW() 
             WHERE id = $2`,
            [reply, id]
        );

        // Tạo thông báo
        await pool.query(
            `INSERT INTO notifications (user_email, title, message, "is_read")
             VALUES ($1, $2, $3, FALSE)`,
            [
                request.email,
                `Phản hồi cho yêu cầu: ${request.topic}`,
                reply
            ]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Lỗi khi phản hồi:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

/*----------------------------------
Create support request
-----------------------------------*/
const createRequest = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { name, email, topic, message } = req.body;

        if (!name || !email || !topic || !message) {
            res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
            return;
        }

        await pool.query(
            `INSERT INTO support_requests (name, email, topic, message)
             VALUES ($1, $2, $3, $4)`,
            [name, email, topic, message]
        );

        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Lỗi khi tạo yêu cầu hỗ trợ:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

/*----------------------------------
Routes
-----------------------------------*/
router.get('/', adminAuth, getAllRequests);
router.post('/:id/reply', adminAuth, replyToRequest);
router.post('/', createRequest);

export default router;

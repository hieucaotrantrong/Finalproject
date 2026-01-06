import express, { Request, Response } from 'express';
import pool from '../config/database';
import { auth } from '../types/auth';

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
  Lấy thông tin ví
-----------------------------------*/
router.get('/info', auth, asyncHandler(async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        const result = await pool.query(
            `SELECT * FROM wallets WHERE user_id = $1`,
            [userId]
        );

        // Nếu ví chưa có → tạo ví mới
        if (result.rows.length === 0) {
            await pool.query(
                `INSERT INTO wallets (user_id, balance)
                 VALUES ($1, 0)
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );

            return res.json({ wallet: { balance: 0 } });
        }

        res.json({ wallet: result.rows[0] });
    } catch (error) {
        console.error('Lỗi lấy thông tin ví:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));

/*----------------------------------
  Tạo yêu cầu nạp tiền
-----------------------------------*/
router.post('/deposit', auth, asyncHandler(async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        const userId = req.user?.userId;

        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Số tiền không hợp lệ' });
            return;
        }

        const transferCode = `NAP${userId}${Date.now()}`;

        await pool.query(
            `INSERT INTO deposit_requests 
            (user_id, amount, transfer_code, bank_account, status) 
             VALUES ($1, $2, $3, $4, 'pending')`,
            [
                userId,
                amount,
                transferCode,
                'Vietcombank - 1021966858 - CAO TRẦN TRỌNG HIẾU'
            ]
        );

        res.json({
            success: true,
            transferCode,
            bankInfo: {
                bank: 'Vietcombank',
                accountNumber: '1021966858',
                accountName: 'CAO TRẦN TRỌNG HIẾU'
            }
        });
    } catch (error) {
        console.error('Lỗi tạo yêu cầu nạp tiền:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));

/*----------------------------------
  Lấy ví + lịch sử nạp tiền
-----------------------------------*/
router.get('/', auth, asyncHandler(async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        // Tạo ví nếu chưa có — PostgreSQL version
        await pool.query(
            `INSERT INTO wallets (user_id, balance)
             VALUES ($1, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        // Lấy thông tin ví
        const walletResult = await pool.query(
            `SELECT * FROM wallets WHERE user_id = $1`,
            [userId]
        );

        // Lịch sử nạp tiền
        const depositResult = await pool.query(
            `SELECT * 
             FROM deposit_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            wallet: walletResult.rows[0],
            depositHistory: depositResult.rows
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin ví:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));

export default router;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { DecodedToken } from '../types/auth';

export const adminAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Không tìm thấy token' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;

        if (!decoded.userId) {
            res.status(403).json({ error: 'Token không hợp lệ' });
            return;
        }

        const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1 LIMIT 1',
            [decoded.userId]
        );

        const userRole = userResult.rows[0]?.role;

        //  Kiểm tra quyền admin từ dữ liệu user thật trong DB
        if (userRole !== 'admin') {
            res.status(403).json({ error: 'Bạn không có quyền truy cập admin' });
            return;
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token không hợp lệ' });
    }
};




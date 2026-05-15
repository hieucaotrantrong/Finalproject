import { Request, Response } from 'express';
import pool from '../config/database';
import transporter from '../config/mail';
import {
    calculateDiscountAmount,
    getActiveDiscountByCode,
    hasUserUsedDiscount
} from '../services/discount.service';

/*----------------------------------
Get all discount codes
-----------------------------------*/
export const getAllDiscounts = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT * FROM discounts
            ORDER BY created_at DESC
        `);
        res.json(result.rows || []);
    } catch (err) {
       
        res.status(500).json({ error: 'Lỗi khi lấy mã giảm giá' });
    }
};

/*----------------------------------
Get discount by id
-----------------------------------*/
export const getDiscountById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM discounts WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Lỗi khi lấy mã giảm giá:', err);
        res.status(500).json({ error: 'Lỗi khi lấy mã giảm giá' });
    }
};

/*----------------------------------
Create discount code
-----------------------------------*/
export const createDiscount = async (req: Request, res: Response): Promise<void> => {
    const { code, discount_type, discount_value, min_amount, max_uses, expiry_date, description, is_active } = req.body;
    // If admin wants to notify customers when creating the discount, set notify_customers=true in request body.
    const notifyCustomers = req.body.notify_customers !== false; // default true

    // Validation
    if (!code || !discount_type || discount_value === undefined) {
        res.status(400).json({ error: 'Các trường bắt buộc không được để trống' });
        return;
    }

    try {
        // Check if code already exists
        const existingCode = await pool.query('SELECT * FROM discounts WHERE code = $1', [code]);
        if (existingCode.rows.length > 0) {
            res.status(400).json({ error: 'Mã giảm giá đã tồn tại' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO discounts (code, discount_type, discount_value, min_amount, max_uses, expiry_date, description, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING *`,
            [code, discount_type, discount_value, min_amount || 0, max_uses || null, expiry_date || null, description || '', is_active !== false]
        );

        const created = result.rows[0];

        // Gửi thông báo cho khách hàng
        if (notifyCustomers) {
            (async () => {
                try {
                    const usersRes = await pool.query(`SELECT email, first_name FROM users WHERE email IS NOT NULL AND email <> ''`);
                    const users = usersRes.rows || [];

                    const subject = `Mã giảm giá mới nhanh tay nhập ngay: ${created.code} - Ưu đãi trong thời gian có hạn`;
                    const expiryText = created.expiry_date ? new Date(created.expiry_date).toLocaleDateString('vi-VN') : 'Không giới hạn';
                    const valueText = created.discount_type === 'percentage' ? `${created.discount_value}%` : `${Number(created.discount_value).toLocaleString('vi-VN')} đ`;
                    
                    // Insert in-app notifications for all users (so they see it in the app)
                    try {
                        const notifTitle = `Mã giảm giá mới nhanh tay nhập ngay: ${created.code}`;
                        const notifMessage = `Ưu đãi ${valueText} - Hạn dùng: ${expiryText} - Yêu cầu tối thiểu: ${Number(created.min_amount || 0).toLocaleString('vi-VN')} đ`;
                        await pool.query(
                            `INSERT INTO notifications (user_email, title, message, is_read)
                             SELECT email, $1, $2, FALSE
                             FROM users
                             WHERE email IS NOT NULL AND email <> ''`,
                            [notifTitle, notifMessage]
                        );
                    } catch (err) {
                      
                    }

                    // Gửi email thông báo mã giảm giá mới cho tất cả người dùng có email 
                    const sendPromises = users.map((u: any) => {
                        const to = u.email;
                        const name = u.first_name || '';
                        const html = `
                            <p>Xin chào ${name},</p>
                            <p>Bạn đã nhận được voucher TDDD<strong>${created.code}</strong> — <strong>${valueText}</strong>.</p>
                            <ul>
                              <li>Yêu cầu tối thiểu: ${Number(created.min_amount || 0).toLocaleString('vi-VN')} đ</li>
                              <li>Hạn dùng: ${expiryText}</li>
                              <li>Số lượt tối đa: ${created.max_uses !== null ? created.max_uses : 'Vô hạn'}</li>
                            </ul>
                            <p>Nhanh tay sử dụng mã khi mua hàng để được giảm giá!</p>
                            <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}">Mua ngay</a></p>
                        `;

                        return transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to,
                            subject,
                            html
                        }).catch((err) => {
                            console.error('Lỗi khi gửi email thông báo mã giảm giá tới', to, err);
                        });
                    });

                    // limit concurrency: run in batches of 20 to avoid SMTP throttling
                    const BATCH = 20;
                    for (let i = 0; i < sendPromises.length; i += BATCH) {
                        await Promise.all(sendPromises.slice(i, i + BATCH));
                    }
                } catch (err) {
                  
                }
            })();
        }

        res.status(201).json(created);
    } catch (err) {
        console.error('Lỗi khi tạo mã giảm giá:', err);
        res.status(500).json({ error: 'Lỗi khi tạo mã giảm giá' });
    }
};

/*----------------------------------
Update discount code
-----------------------------------*/
export const updateDiscount = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { code, discount_type, discount_value, min_amount, max_uses, expiry_date, description, is_active } = req.body;

    try {
        const result = await pool.query(
            `UPDATE discounts 
             SET code = COALESCE($1, code),
                 discount_type = COALESCE($2, discount_type),
                 discount_value = COALESCE($3, discount_value),
                 min_amount = COALESCE($4, min_amount),
                 max_uses = COALESCE($5, max_uses),
                 expiry_date = COALESCE($6, expiry_date),
                 description = COALESCE($7, description),
                 is_active = COALESCE($8, is_active),
                 updated_at = NOW()
             WHERE id = $9
             RETURNING *`,
            [code, discount_type, discount_value, min_amount, max_uses, expiry_date, description, is_active, id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });
            return;
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Lỗi khi cập nhật mã giảm giá:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật mã giảm giá' });
    }
};

/*----------------------------------
Delete discount code
-----------------------------------*/
export const deleteDiscount = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM discounts WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });
            return;
        }
        res.json({ message: 'Xóa mã giảm giá thành công' });
    } catch (err) {
        console.error('Lỗi khi xóa mã giảm giá:', err);
        res.status(500).json({ error: 'Lỗi khi xóa mã giảm giá' });
    }
};

/*----------------------------------
Verify discount code
-----------------------------------*/
export const verifyDiscount = async (req: Request, res: Response): Promise<void> => {
    const { code, cartTotal } = req.body;
    const userId = req.user?.userId;

    if (!code) {
        res.status(400).json({ error: 'Mã giảm giá không được để trống' });
        return;
    }

    if (!userId) {
        res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
        return;
    }

    try {
        const discount = await getActiveDiscountByCode(code);

        if (!discount) {
            res.status(404).json({ error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
            return;
        }

        // Check expiry date
        if (discount.expiry_date && new Date(discount.expiry_date) < new Date()) {
            res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });
            return;
        }

        if (discount.max_uses !== null && Number(discount.current_uses || 0) >= Number(discount.max_uses)) {
            res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng' });
            return;
        }

        const usedBefore = await hasUserUsedDiscount(userId, discount.code);
        if (usedBefore) {
            res.status(400).json({ error: 'Bạn đã sử dụng mã giảm giá này rồi' });
            return;
        }

        // Check minimum amount
        if (cartTotal < discount.min_amount) {
            res.status(400).json({ error: `Mã giảm giá yêu cầu tối thiểu ${discount.min_amount.toLocaleString('vi-VN')} đ` });
            return;
        }

        // Calculate discount amount
        const discountAmount = calculateDiscountAmount(discount, cartTotal);

      
        res.json({
            code: discount.code,
            discount_type: discount.discount_type,
            discount_value: discount.discount_value,
            discount_amount: discountAmount,
            final_total: Math.max(0, cartTotal - discountAmount)
        });
    } catch (err) {
        console.error('Lỗi khi xác minh mã giảm giá:', err);
        res.status(500).json({ error: 'Lỗi khi xác minh mã giảm giá' });
    }
};

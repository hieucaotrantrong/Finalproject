import pool from '../config/database';

export type DiscountRecord = {
    id: number;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_amount: number;
    max_uses: number | null;
    current_uses: number | null;
    expiry_date: string | null;
    is_active: boolean;
};

export const normalizeDiscountCode = (code: string): string => {
    return String(code || '').trim().toUpperCase();
};

export const getActiveDiscountByCode = async (code: string): Promise<DiscountRecord | null> => {
    const normalizedCode = normalizeDiscountCode(code);

    const result = await pool.query(
        `SELECT * FROM discounts WHERE code = $1 AND is_active = true`,
        [normalizedCode]
    );

    return result.rows[0] || null;
};

export const hasUserUsedDiscount = async (userId: string | number, code: string): Promise<boolean> => {
    const normalizedCode = normalizeDiscountCode(code);

    const userResult = await pool.query(
        `SELECT email FROM users WHERE id = $1 LIMIT 1`,
        [userId]
    );

    const userEmail = userResult.rows[0]?.email || null;

    const result = await pool.query(
        `SELECT 1
         FROM orders
         WHERE discount_code = $1
           AND (user_id = $2 OR (COALESCE($3::text, '') != '' AND email = $3::text))
         LIMIT 1`,
        [normalizedCode, userId, userEmail]
    );

    return result.rows.length > 0;
};

export const calculateDiscountAmount = (discount: DiscountRecord, cartTotal: number): number => {
    const safeCartTotal = Number(cartTotal) || 0;

    if (discount.discount_type === 'percentage') {
        return (safeCartTotal * Number(discount.discount_value || 0)) / 100;
    }

    if (discount.discount_type === 'fixed') {
        return Number(discount.discount_value || 0);
    }

    return 0;
};

export const incrementDiscountUsage = async (discountId: number): Promise<void> => {
    await pool.query(
        `UPDATE discounts SET current_uses = COALESCE(current_uses, 0) + 1, updated_at = NOW() WHERE id = $1`,
        [discountId]
    );
};

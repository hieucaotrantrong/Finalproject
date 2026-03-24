import { Request, Response } from "express";
import pool from "../config/database";

// --- 1. HÀM TRỢ GIÚP (Helper) ---
const getUserEmail = async (userId?: string) => {
  if (!userId) return null;
  const { rows } = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
  return rows[0]?.email || null;
};

// --- 2. TẠO ĐÁNH GIÁ ---
export const createReview = async (req: Request, res: Response): Promise<void> => {
  const { productId, rating, comment } = req.body;
  const userEmail = await getUserEmail(req.user?.userId);

  if (!userEmail) {
    res.status(401).json({ message: "Vui lòng đăng nhập" });
    return;
  }

  try {
    // Kiểm tra xem đã mua hàng chưa và lấy OrderId trong 1 nốt nhạc
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE email = $1 AND product_id = $2 AND status = 'completed' LIMIT 1`,
      [userEmail, productId]
    );

    if (orderCheck.rows.length === 0) {
      res.status(403).json({ message: "Bạn cần hoàn thành đơn hàng để đánh giá" });
      return;
    }

    // Insert thẳng, dùng UNIQUE constraint của DB để chặn trùng (email, product_id)
    const result = await pool.query(
      `INSERT INTO reviews (email, product_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email, product_id) DO NOTHING
       RETURNING *`,
      [userEmail, productId, orderCheck.rows[0].id, rating, comment || ""]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
      return;
    }

    res.json({ message: "Đánh giá thành công", review: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- 3. LẤY DANH SÁCH ĐÁNH GIÁ ---
export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.first_name, u.last_name 
       FROM reviews r 
       LEFT JOIN users u ON r.email = u.email 
       WHERE r.product_id = $1 ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- 4. KIỂM TRA QUYỀN (Dùng cho Frontend hiển thị nút) ---
export const canReview = async (req: Request, res: Response): Promise<void> => {
  const userEmail = await getUserEmail(req.user?.userId);
  if (!userEmail) {
    res.json({ canReview: false });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM orders WHERE email = $1 AND product_id = $2 AND status = 'completed'
      ) AND NOT EXISTS (
        SELECT 1 FROM reviews WHERE email = $1 AND product_id = $2
      ) as "canReview"`,
      [userEmail, req.query.productId]
    );
    res.json({ canReview: rows[0].canReview });
  } catch (error) {
    res.json({ canReview: false });
  }
};
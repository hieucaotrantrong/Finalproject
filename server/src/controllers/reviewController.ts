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
    const userId = req.user?.userId ? Number(req.user.userId) : null;
    const { rows } = await pool.query(
      `SELECT r.*, COALESCE(r.likes_count, 0) AS likes_count, u.first_name, u.last_name,
        CASE WHEN rl.user_id IS NULL THEN false ELSE true END AS liked_by_user
       FROM reviews r
       LEFT JOIN users u ON r.email = u.email
       LEFT JOIN review_likes rl ON rl.review_id = r.id AND rl.user_id = $2
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId, userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- 4. LIKE REVIEW ---
export const likeReview = async (req: Request, res: Response): Promise<void> => {
  const { reviewId } = req.params;

  try {
    const userId = req.user?.userId ? Number(req.user.userId) : null;
    if (!userId) {
      res.status(401).json({ message: "Vui lòng đăng nhập" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insert = await client.query(
        `INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING id`,
        [reviewId, userId]
      );

      if (insert.rowCount === 0) {
        // user already liked
        const { rows } = await client.query(
          `SELECT COALESCE(likes_count, 0) AS likes_count FROM reviews WHERE id = $1`,
          [reviewId]
        );
        await client.query("COMMIT");
        res.json({ liked: false, likes_count: rows[0]?.likes_count || 0 });
        return;
      }

      const up = await client.query(
        `UPDATE reviews SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1 RETURNING likes_count`,
        [reviewId]
      );

      await client.query("COMMIT");
      res.json({ liked: true, likes_count: up.rows[0]?.likes_count || 0 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- 5. KIỂM TRA QUYỀN (Dùng cho Frontend hiển thị nút) ---
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
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReview = exports.getReviews = exports.createReview = void 0;
const database_1 = __importDefault(require("../config/database"));
const ensureReviewsTable = () => __awaiter(void 0, void 0, void 0, function* () {
    // Create table if not exists
    yield database_1.default.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      product_id INTEGER NOT NULL,
      order_id INTEGER,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (email, product_id)
    )
  `);
    // Add missing columns if they don't exist
    const checkColumns = yield database_1.default.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'reviews'
  `);
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    // Add 'name' column if missing
    if (!existingColumns.includes('name')) {
        yield database_1.default.query(`ALTER TABLE reviews ADD COLUMN name VARCHAR(255)`);
    }
    // Add 'order_id' column if missing
    if (!existingColumns.includes('order_id')) {
        yield database_1.default.query(`ALTER TABLE reviews ADD COLUMN order_id INTEGER`);
    }
});
const getUserInfoFromToken = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId)
        return { email: "", name: "" };
    const result = yield database_1.default.query("SELECT email, first_name, last_name FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user)
        return { email: "", name: "" };
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
    return { email: user.email, name };
});
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, rating, comment } = req.body;
    try {
        yield ensureReviewsTable();
        const userInfo = yield getUserInfoFromToken((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
        if (!userInfo.email) {
            res.status(401).json({ message: "Vui lòng đăng nhập để đánh giá" });
            return;
        }
        const userEmail = userInfo.email;
        const numericProductId = Number(productId);
        const numericRating = Number(rating);
        if (!numericProductId || !numericRating) {
            res.status(400).json({ message: "Thiếu productId hoặc rating" });
            return;
        }
        if (numericRating < 1 || numericRating > 5) {
            res.status(400).json({ message: "Rating phải từ 1 đến 5" });
            return;
        }
        const completedOrder = yield database_1.default.query(`SELECT id, created_at FROM orders
       WHERE email = $1 AND product_id = $2 AND status = 'completed'
       LIMIT 1`, [userEmail, numericProductId]);
        if (completedOrder.rows.length === 0) {
            res.status(403).json({ message: "Phải mua và hoàn thành đơn hàng mới được đánh giá" });
            return;
        }
        const orderId = completedOrder.rows[0].id;
        const existingReview = yield database_1.default.query(`SELECT id FROM reviews WHERE email = $1 AND product_id = $2 LIMIT 1`, [userEmail, numericProductId]);
        if (existingReview.rows.length > 0) {
            res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
            return;
        }
        const insertResult = yield database_1.default.query(`INSERT INTO reviews (email, product_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, product_id, rating, comment, created_at`, [userEmail, numericProductId, orderId, numericRating, comment || ""]);
        res.json({ message: "Đánh giá thành công", review: insertResult.rows[0] });
    }
    catch (error) {
        console.error("Lỗi tạo đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});
exports.createReview = createReview;
const getReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId } = req.params;
    try {
        yield ensureReviewsTable();
        const rows = yield database_1.default.query(`SELECT 
        r.id, 
        r.email, 
        r.product_id, 
        r.order_id, 
        r.rating, 
        r.comment, 
        r.created_at,
        COALESCE(u.first_name, '') as first_name,
        COALESCE(u.last_name, '') as last_name
       FROM reviews r
       LEFT JOIN users u ON r.email = u.email
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`, [Number(productId)]);
        res.json(rows.rows);
    }
    catch (error) {
        console.error("Lỗi lấy đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});
exports.getReviews = getReviews;
const canReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId } = req.query;
    try {
        yield ensureReviewsTable();
        const userInfo = yield getUserInfoFromToken((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
        if (!userInfo.email) {
            res.json({ canReview: false });
            return;
        }
        const userEmail = userInfo.email;
        const numericProductId = Number(productId);
        if (!numericProductId) {
            res.json({ canReview: false });
            return;
        }
        const completedOrder = yield database_1.default.query(`SELECT id FROM orders
       WHERE email = $1 AND product_id = $2 AND status = 'completed'
       LIMIT 1`, [userEmail, numericProductId]);
        const existingReview = yield database_1.default.query(`SELECT id FROM reviews WHERE email = $1 AND product_id = $2 LIMIT 1`, [userEmail, numericProductId]);
        res.json({
            canReview: completedOrder.rows.length > 0 && existingReview.rows.length === 0,
        });
    }
    catch (error) {
        console.error("Lỗi kiểm tra quyền đánh giá:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});
exports.canReview = canReview;

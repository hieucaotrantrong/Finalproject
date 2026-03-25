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
// --- 1. HÀM TRỢ GIÚP (Helper) ---
const getUserEmail = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!userId)
        return null;
    const { rows } = yield database_1.default.query("SELECT email FROM users WHERE id = $1", [userId]);
    return ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.email) || null;
});
// --- 2. TẠO ĐÁNH GIÁ ---
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, rating, comment } = req.body;
    const userEmail = yield getUserEmail((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
    if (!userEmail) {
        res.status(401).json({ message: "Vui lòng đăng nhập" });
        return;
    }
    try {
        // Kiểm tra xem đã mua hàng chưa và lấy OrderId trong 1 nốt nhạc
        const orderCheck = yield database_1.default.query(`SELECT id FROM orders WHERE email = $1 AND product_id = $2 AND status = 'completed' LIMIT 1`, [userEmail, productId]);
        if (orderCheck.rows.length === 0) {
            res.status(403).json({ message: "Bạn cần hoàn thành đơn hàng để đánh giá" });
            return;
        }
        // Insert thẳng, dùng UNIQUE constraint của DB để chặn trùng (email, product_id)
        const result = yield database_1.default.query(`INSERT INTO reviews (email, product_id, order_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email, product_id) DO NOTHING
       RETURNING *`, [userEmail, productId, orderCheck.rows[0].id, rating, comment || ""]);
        if (result.rows.length === 0) {
            res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
            return;
        }
        res.json({ message: "Đánh giá thành công", review: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
});
exports.createReview = createReview;
// --- 3. LẤY DANH SÁCH ĐÁNH GIÁ ---
const getReviews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rows } = yield database_1.default.query(`SELECT r.*, u.first_name, u.last_name 
       FROM reviews r 
       LEFT JOIN users u ON r.email = u.email 
       WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [req.params.productId]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
});
exports.getReviews = getReviews;
// --- 4. KIỂM TRA QUYỀN (Dùng cho Frontend hiển thị nút) ---
const canReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userEmail = yield getUserEmail((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
    if (!userEmail) {
        res.json({ canReview: false });
        return;
    }
    try {
        const { rows } = yield database_1.default.query(`SELECT EXISTS (
        SELECT 1 FROM orders WHERE email = $1 AND product_id = $2 AND status = 'completed'
      ) AND NOT EXISTS (
        SELECT 1 FROM reviews WHERE email = $1 AND product_id = $2
      ) as "canReview"`, [userEmail, req.query.productId]);
        res.json({ canReview: rows[0].canReview });
    }
    catch (error) {
        res.json({ canReview: false });
    }
});
exports.canReview = canReview;

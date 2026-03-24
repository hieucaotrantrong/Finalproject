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
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const adminAuth_1 = require("../middleware/adminAuth");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
/* ---------------------------------------------
   FIX EXPRESS TYPESCRIPT RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*--------------------------------------------------
 🧾 Lấy danh sách yêu cầu nạp tiền
--------------------------------------------------*/
router.get('/deposits', adminAuth_1.adminAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`
            SELECT dr.*, u.email AS user_email
            FROM deposit_requests dr
            JOIN users u ON dr.user_id = u.id
            ORDER BY dr.created_at DESC
        `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('❌ Lỗi lấy danh sách nạp tiền:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách nạp tiền' });
    }
})));
/*--------------------------------------------------
  Duyệt yêu cầu nạp tiền (Transaction PGSQL)
--------------------------------------------------*/
router.put('/deposits/:id/approve', adminAuth_1.adminAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default.connect();
    try {
        const { id } = req.params;
        const pending = yield client.query(`SELECT * FROM deposit_requests WHERE id = $1 AND status = 'pending'`, [id]);
        if (pending.rows.length === 0) {
            client.release();
            res.status(404).json({ error: "Không tìm thấy yêu cầu hoặc đã xử lý" });
            return;
        }
        const deposit = pending.rows[0];
        yield client.query("BEGIN");
        yield client.query(`UPDATE deposit_requests SET status = 'approved' WHERE id = $1`, [id]);
        yield client.query(`INSERT INTO wallets (user_id, balance)
             VALUES ($1, 0)
             ON CONFLICT (user_id) DO NOTHING`, [deposit.user_id]);
        yield client.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [deposit.amount, deposit.user_id]);
        yield client.query("COMMIT");
        res.json({
            success: true,
            message: `Đã duyệt yêu cầu nạp tiền cho user_id=${deposit.user_id}`
        });
    }
    catch (error) {
        yield client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ error: "Lỗi khi xử lý duyệt nạp tiền" });
    }
    finally {
        client.release();
    }
})));
/*--------------------------------------------------
  Từ chối yêu cầu nạp tiền
--------------------------------------------------*/
router.put('/deposits/:id/reject', adminAuth_1.adminAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield database_1.default.query(`UPDATE deposit_requests 
             SET status = 'rejected' 
             WHERE id = $1 AND status = 'pending'`, [id]);
        res.json({ success: true, message: "Đã từ chối yêu cầu nạp tiền" });
    }
    catch (error) {
        console.error("❌ Lỗi từ chối yêu cầu:", error);
        res.status(500).json({ error: "Lỗi server khi từ chối yêu cầu" });
    }
})));
/*--------------------------------------------------
  Quản lý người dùng
--------------------------------------------------*/
router.get('/users', adminAuth_1.adminAuth, asyncHandler(user_controller_1.getAllUsers));
router.get('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.getUserById));
router.post('/users', adminAuth_1.adminAuth, asyncHandler(user_controller_1.createUser));
router.put('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.updateUser));
router.delete('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.deleteUser));
exports.default = router;

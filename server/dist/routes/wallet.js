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
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../types/auth");
const router = express_1.default.Router();
/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------
  Lấy thông tin ví
-----------------------------------*/
router.get('/info', auth_1.auth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const result = yield database_1.default.query(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
        // Nếu ví chưa có → tạo ví mới
        if (result.rows.length === 0) {
            yield database_1.default.query(`INSERT INTO wallets (user_id, balance)
                 VALUES ($1, 0)
                 ON CONFLICT (user_id) DO NOTHING`, [userId]);
            return res.json({ wallet: { balance: 0 } });
        }
        res.json({ wallet: result.rows[0] });
    }
    catch (error) {
        console.error('Lỗi lấy thông tin ví:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
})));
/*----------------------------------
  Tạo yêu cầu nạp tiền
-----------------------------------*/
router.post('/deposit', auth_1.auth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Số tiền không hợp lệ' });
            return;
        }
        const transferCode = `NAP${userId}${Date.now()}`;
        yield database_1.default.query(`INSERT INTO deposit_requests 
            (user_id, amount, transfer_code, bank_account, status) 
             VALUES ($1, $2, $3, $4, 'pending')`, [
            userId,
            amount,
            transferCode,
            'Vietcombank - 1021966858 - CAO TRẦN TRỌNG HIẾU'
        ]);
        res.json({
            success: true,
            transferCode,
            bankInfo: {
                bank: 'Vietcombank',
                accountNumber: '1021966858',
                accountName: 'CAO TRẦN TRỌNG HIẾU'
            }
        });
    }
    catch (error) {
        console.error('Lỗi tạo yêu cầu nạp tiền:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
})));
/*----------------------------------
  Lấy ví + lịch sử nạp tiền
-----------------------------------*/
router.get('/', auth_1.auth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        // Tạo ví nếu chưa có — PostgreSQL version
        yield database_1.default.query(`INSERT INTO wallets (user_id, balance)
             VALUES ($1, 0)
             ON CONFLICT (user_id) DO NOTHING`, [userId]);
        // Lấy thông tin ví
        const walletResult = yield database_1.default.query(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
        // Lịch sử nạp tiền
        const depositResult = yield database_1.default.query(`SELECT * 
             FROM deposit_requests 
             WHERE user_id = $1 
             ORDER BY created_at DESC`, [userId]);
        res.json({
            wallet: walletResult.rows[0],
            depositHistory: depositResult.rows
        });
    }
    catch (error) {
        console.error('Lỗi lấy thông tin ví:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
})));
exports.default = router;

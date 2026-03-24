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
const router = (0, express_1.Router)();
/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------
Get all support requests
-----------------------------------*/
const getAllRequests = asyncHandler((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT * FROM support_requests ORDER BY created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Lỗi khi lấy danh sách hỗ trợ:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));
/*----------------------------------
Reply to a support request
-----------------------------------*/
const replyToRequest = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        // Lấy thông tin support request
        const result = yield database_1.default.query(`SELECT email, topic FROM support_requests WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy yêu cầu hỗ trợ' });
            return;
        }
        const request = result.rows[0];
        // Cập nhật phản hồi
        yield database_1.default.query(`UPDATE support_requests 
             SET reply = $1, status = 'replied', replied_at = NOW() 
             WHERE id = $2`, [reply, id]);
        // Tạo thông báo
        yield database_1.default.query(`INSERT INTO notifications (user_email, title, message, "is_read")
             VALUES ($1, $2, $3, FALSE)`, [
            request.email,
            `Phản hồi cho yêu cầu: ${request.topic}`,
            reply
        ]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Lỗi khi phản hồi:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));
/*----------------------------------
Create support request
-----------------------------------*/
const createRequest = asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, topic, message } = req.body;
        if (!name || !email || !topic || !message) {
            res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
            return;
        }
        yield database_1.default.query(`INSERT INTO support_requests (name, email, topic, message)
             VALUES ($1, $2, $3, $4)`, [name, email, topic, message]);
        res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Lỗi khi tạo yêu cầu hỗ trợ:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}));
/*----------------------------------
Routes
-----------------------------------*/
router.get('/', adminAuth_1.adminAuth, getAllRequests);
router.post('/:id/reply', adminAuth_1.adminAuth, replyToRequest);
router.post('/', createRequest);
exports.default = router;

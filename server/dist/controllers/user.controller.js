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
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/*----------------------------------
  Get all users
-----------------------------------*/
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT id, first_name, last_name, email, role, phone, address, birth_date, gender, avatar, updated_at
       FROM users
       ORDER BY updated_at DESC`);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Lỗi getAllUsers:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.getAllUsers = getAllUsers;
/*----------------------------------
  Get user by ID
-----------------------------------*/
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const result = yield database_1.default.query(`SELECT id, first_name, last_name, email, role, phone, address, birth_date, gender, avatar, updated_at
       FROM users 
       WHERE id = $1 
       LIMIT 1`, [id]);
        res.json(result.rows[0] || null);
    }
    catch (err) {
        console.error('Lỗi getUserById:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.getUserById = getUserById;
/*----------------------------------
  Create user
-----------------------------------*/
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { first_name, last_name, email, password, role, phone, address, birth_date, gender, avatar } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email và password là bắt buộc' });
            return;
        }
        // Check email exist
        const exists = yield database_1.default.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
        if (exists.rows.length > 0) {
            res.status(409).json({ error: 'Email đã tồn tại' });
            return;
        }
        const hashed = yield bcryptjs_1.default.hash(password, 10);
        yield database_1.default.query(`INSERT INTO users (first_name, last_name, email, password, role, phone, address, birth_date, gender, avatar, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`, [
            first_name || null,
            last_name || null,
            email,
            hashed,
            role || 'user',
            phone || null,
            address || null,
            birth_date || null,
            gender || null,
            avatar || null
        ]);
        res.status(201).json({ success: true });
    }
    catch (err) {
        console.error('Lỗi createUser:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.createUser = createUser;
/*----------------------------------
  Update user
-----------------------------------*/
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { first_name, last_name, role, phone, address, birth_date, gender, avatar } = req.body;
        let genderValue = gender;
        if (!['male', 'female', 'other'].includes(genderValue)) {
            genderValue = null;
        }
        const result = yield database_1.default.query(`UPDATE users 
       SET first_name = $1,
           last_name = $2,
           role = $3,
           phone = $4,
           address = $5,
           birth_date = $6,
           gender = $7,
           avatar = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`, [
            first_name || null,
            last_name || null,
            role || null,
            phone || null,
            address || null,
            birth_date || null,
            genderValue,
            avatar || null,
            id
        ]);
        if (result.rowCount && result.rowCount > 0) {
            res.json({ success: true });
        }
        else {
            res.status(404).json({ error: 'Người dùng không tồn tại' });
        }
    }
    catch (err) {
        console.error('Lỗi updateUser:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.updateUser = updateUser;
/*----------------------------------
  Delete user
-----------------------------------*/
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const result = yield database_1.default.query(`DELETE FROM users WHERE id = $1`, [id]);
        if (result.rowCount && result.rowCount > 0) {
            res.json({ success: true });
        }
        else {
            res.status(404).json({ error: 'Người dùng không tồn tại' });
        }
    }
    catch (err) {
        console.error('Lỗi deleteUser:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.deleteUser = deleteUser;

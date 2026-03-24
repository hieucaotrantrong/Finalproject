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
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.default = {
    /* -----------------------------------------
       Create User
    ------------------------------------------ */
    createUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(user.password, salt);
            const result = yield database_1.default.query(`INSERT INTO users (first_name, last_name, email, password, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [
                user.first_name,
                user.last_name,
                user.email,
                hashedPassword,
                user.role || "user"
            ]);
            return result.rows[0];
        });
    },
    /* -----------------------------------------
       Find by email
    ------------------------------------------ */
    findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield database_1.default.query("SELECT * FROM users WHERE email = $1", [email]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    },
    /* -----------------------------------------
       Find by ID
    ------------------------------------------ */
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield database_1.default.query("SELECT * FROM users WHERE id = $1", [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
    },
    /* -----------------------------------------
       Update Profile
    ------------------------------------------ */
    updateProfile(userId, profileData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { first_name, last_name, email, phone, address, birth_date, gender, avatar } = profileData;
            // Format date for PostgreSQL (YYYY-MM-DD)
            let formattedBirthDate = birth_date ? new Date(birth_date).toISOString().split("T")[0] : null;
            yield database_1.default.query(`UPDATE users SET 
                first_name = $1,
                last_name = $2,
                email = $3,
                phone = $4,
                address = $5,
                birth_date = $6,
                gender = $7,
                avatar = $8
             WHERE id = $9`, [
                first_name,
                last_name,
                email,
                phone,
                address,
                formattedBirthDate,
                gender,
                avatar,
                userId
            ]);
            return this.findById(userId);
        });
    },
    /* -----------------------------------------
       Verify Password
    ------------------------------------------ */
    verifyPassword(userId, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.findById(userId);
            if (!user)
                return false;
            return yield bcryptjs_1.default.compare(password, user.password);
        });
    },
    /* -----------------------------------------
       Change Password
    ------------------------------------------ */
    changePassword(userId, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
            const result = yield database_1.default.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, userId]);
            return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
        });
    }
};

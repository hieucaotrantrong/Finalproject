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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("./config/database"));
function createAdmin() {
    return __awaiter(this, void 0, void 0, function* () {
        const password = "admin123";
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hash = yield bcryptjs_1.default.hash(password, salt);
        console.log("Hashed password:", hash);
        console.log("\n--- SQL INSERT Statement ---");
        console.log(`INSERT INTO users (first_name, last_name, email, password, role)`);
        console.log(`VALUES ('Admin', 'System', 'admin@gmail.com', '${hash}', 'admin');`);
        // Tự động insert vào database
        try {
            const result = yield database_1.default.query(`INSERT INTO users (first_name, last_name, email, password, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE
             SET password = EXCLUDED.password, role = 'admin', updated_at = CURRENT_TIMESTAMP
             RETURNING id, email, role`, ['Admin', 'System', 'admin@gmail.com', hash, 'admin']);
            console.log("\n Đã tạo admin thành công!");
            console.log("   ID:", result.rows[0].id);
            console.log("   Email:", result.rows[0].email);
            console.log("   Role:", result.rows[0].role);
        }
        catch (error) {
            if (error.code === '23505') {
                console.log("\n⚠️  Admin đã tồn tại, đang cập nhật...");
                yield database_1.default.query(`UPDATE users SET password = $1, role = 'admin' WHERE email = $2`, [hash, 'admin@gmail.com']);
                console.log(" Đã cập nhật password cho admin!");
            }
            else {
                console.error(" Lỗi:", error.message);
            }
        }
        yield database_1.default.end();
    });
}
createAdmin();

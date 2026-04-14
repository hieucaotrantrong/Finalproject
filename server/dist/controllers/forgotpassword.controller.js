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
exports.resetPassword = exports.verifyOTP = exports.forgotPassword = void 0;
const mail_1 = __importDefault(require("../config/mail"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
let otpStore = {};
// tạo OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// 1️⃣ gửi OTP
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Thiếu email" });
    }
    const otp = generateOTP();
    otpStore[email] = otp;
    try {
        yield mail_1.default.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Đặt lại mật khẩu - TdddWebsite",
            text: `
TdddWebsite

Xin chào,

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Mã xác thực (OTP) của bạn là: ${otp}

Mã này sẽ hết hạn sau 1 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này để đảm bảo an toàn cho tài khoản.

Trân trọng,
Đội ngũ TdddWebsite
`
        });
        res.json({ message: "OTP đã gửi về email" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Không gửi được email"
        });
    }
});
exports.forgotPassword = forgotPassword;
// 2️ verify OTP
const verifyOTP = (req, res) => {
    const { email, otp } = req.body;
    if (!otpStore[email]) {
        return res.status(400).json({
            message: "Email chưa gửi OTP"
        });
    }
    if (otpStore[email] !== otp) {
        return res.status(400).json({
            message: "OTP sai"
        });
    }
    res.json({
        message: "OTP đúng"
    });
};
exports.verifyOTP = verifyOTP;
// 3️⃣ reset password
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({
            message: "Thiếu email hoặc mật khẩu mới"
        });
    }
    try {
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        yield database_1.default.query("UPDATE users SET password=$1 WHERE email=$2", [hashedPassword, email]);
        delete otpStore[email];
        res.json({
            message: "Đổi mật khẩu thành công"
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Không thể đổi mật khẩu"
        });
    }
});
exports.resetPassword = resetPassword;

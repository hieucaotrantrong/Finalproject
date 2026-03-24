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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserModel_1 = __importDefault(require("../models/UserModel"));
const google_auth_library_1 = require("google-auth-library");
const axios_1 = __importDefault(require("axios"));
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.default = {
    /*-----------------------------------------
   Create Api Sigup
   -------------------------------------------*/
    signup(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name: first_name, lname: last_name, email, password, cpassword } = req.body;
                if (password !== cpassword) {
                    res.status(400).json({ error: 'Mật khẩu không khớp' });
                    return;
                }
                const existingUser = yield UserModel_1.default.findByEmail(email);
                if (existingUser) {
                    res.status(400).json({ error: 'Email đã được sử dụng' });
                    return;
                }
                const newUser = {
                    first_name,
                    last_name,
                    email,
                    password
                };
                const createdUser = yield UserModel_1.default.createUser(newUser);
                const { password: _ } = createdUser, userWithoutPassword = __rest(createdUser, ["password"]);
                res.status(201).json({
                    message: 'Đăng ký thành công',
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error(error);
                next(error);
            }
        });
    },
    /*-----------------------------------------
    Google Login API
    -------------------------------------------*/
    googleLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token } = req.body;
                const ticket = yield googleClient.verifyIdToken({
                    idToken: token,
                    audience: process.env.GOOGLE_CLIENT_ID
                });
                const payload = ticket.getPayload();
                if (!payload || !payload.email) {
                    return res.status(401).json({ error: "Google token không hợp lệ" });
                }
                const email = payload.email;
                const name = payload.name || "";
                let user = yield UserModel_1.default.findByEmail(email);
                if (!user) {
                    const newUser = {
                        first_name: name,
                        last_name: "",
                        email,
                        password: ""
                    };
                    user = yield UserModel_1.default.createUser(newUser);
                }
                const jwtToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                res.json({
                    message: "Đăng nhập Google thành công",
                    token: jwtToken,
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error("Google login error:", error);
                res.status(500).json({ error: "Google login failed" });
            }
        });
    },
    /*-----------------------------------------
    Github Auth API (redirect sang GitHub)
    -------------------------------------------*/
    githubAuth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const clientId = process.env.GITHUB_CLIENT_ID;
            const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`;
            res.redirect(redirectUrl);
        });
    },
    /*-----------------------------------------
    Github Login API
    -------------------------------------------*/
    githubLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const code = req.query.code;
                if (!code) {
                    return res.status(400).json({ error: "Thiếu code từ GitHub" });
                }
                // Lấy access token từ GitHub
                const tokenResponse = yield axios_1.default.post("https://github.com/login/oauth/access_token", {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code
                }, {
                    headers: { Accept: "application/json" }
                });
                const access_token = tokenResponse.data.access_token;
                // Lấy thông tin user GitHub
                const userResponse = yield axios_1.default.get("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                });
                const githubUser = userResponse.data;
                const email = githubUser.email || `${githubUser.login}@github.com`;
                const name = githubUser.name || githubUser.login;
                let user = yield UserModel_1.default.findByEmail(email);
                // Nếu chưa có user thì tạo
                if (!user) {
                    const newUser = {
                        first_name: name,
                        last_name: "",
                        email,
                        password: ""
                    };
                    user = yield UserModel_1.default.createUser(newUser);
                }
                const jwtToken = jsonwebtoken_1.default.sign({
                    userId: user.id,
                    name: user.first_name,
                    email: user.email,
                    avatar: githubUser.avatar_url
                }, process.env.JWT_SECRET, { expiresIn: "1h" });
                // redirect về frontend sau khi login
                // redirect về trang home
                res.redirect(`http://localhost:5173/social-login?token=${jwtToken}`);
            }
            catch (error) {
                console.error("Github login error:", error);
                res.status(500).json({ error: "Github login failed" });
            }
        });
    },
    /*-----------------------------------------
    Create Api Login
    -------------------------------------------*/
    login(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const user = yield UserModel_1.default.findByEmail(email);
                if (!user) {
                    return res.status(401).json({ error: 'Email không tồn tại' });
                }
                const isMatch = yield bcryptjs_1.default.compare(password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ error: 'Mật khẩu không đúng' });
                }
                console.log("SIGN SECRET:", process.env.JWT_SECRET);
                const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                res.json({
                    message: 'Đăng nhập thành công',
                    token,
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Lỗi server' });
            }
        });
    },
    /*-----------------------------------------
    Update Profile API
    -------------------------------------------*/
    updateProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
                    return;
                }
                const profileData = req.body;
                const updatedUser = yield UserModel_1.default.updateProfile(Number(userId), profileData);
                if (!updatedUser) {
                    res.status(404).json({ error: 'Người dùng không tồn tại' });
                    return;
                }
                const { password: _ } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
                res.json({
                    message: 'Cập nhật thông tin thành công',
                    user: userWithoutPassword
                });
            }
            catch (error) {
                console.error('Lỗi cập nhật profile:', error);
                res.status(500).json({ error: 'Lỗi server' });
            }
        });
    },
    /*-----------------------------------------
    Change Password API
    -------------------------------------------*/
    changePassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
                    return;
                }
                const { currentPassword, newPassword } = req.body;
                if (!currentPassword || !newPassword) {
                    res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
                    return;
                }
                // Verify current password
                const isValidPassword = yield UserModel_1.default.verifyPassword(Number(userId), currentPassword);
                if (!isValidPassword) {
                    res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
                    return;
                }
                // Update password
                const success = yield UserModel_1.default.changePassword(Number(userId), newPassword);
                if (!success) {
                    res.status(500).json({ error: 'Không thể đổi mật khẩu' });
                    return;
                }
                res.json({ message: 'Đổi mật khẩu thành công' });
            }
            catch (error) {
                console.error('Lỗi đổi mật khẩu:', error);
                res.status(500).json({ error: 'Lỗi server' });
            }
        });
    },
    /*-----------------------------------------
    Get Profile API
    -------------------------------------------*/
    getProfile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
                const user = yield UserModel_1.default.findById(Number(userId));
                if (!user) {
                    res.status(404).json({ error: 'User not found' });
                    return;
                }
                const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
                res.json({ user: userWithoutPassword });
            }
            catch (error) {
                console.error('Lỗi get profile:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
};

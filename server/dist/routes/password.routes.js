"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const forgotpassword_controller_1 = require("../controllers/forgotpassword.controller");
const router = (0, express_1.Router)();
router.post("/forgot-password", forgotpassword_controller_1.forgotPassword);
router.post("/verify-otp", forgotpassword_controller_1.verifyOTP);
router.post("/reset-password", forgotpassword_controller_1.resetPassword);
exports.default = router;

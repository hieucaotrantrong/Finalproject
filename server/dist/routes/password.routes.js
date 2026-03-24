"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post("/forgot-password", auth_controller_1.forgotPassword);
router.post("/verify-otp", auth_controller_1.verifyOTP);
router.post("/reset-password", auth_controller_1.resetPassword);
exports.default = router;

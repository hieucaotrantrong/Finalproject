import { Router } from "express";
import { forgotPassword, verifyOTP, resetPassword } from "../controllers/auth.controller";

const router = Router();

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

export default router;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = __importDefault(require("../controllers/authController"));
const auth_1 = require("../types/auth");
const router = (0, express_1.Router)();
/* ---------------------------------------------------
  
---------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------
Register Router
-----------------------------------*/
router.post('/signup', asyncHandler(authController_1.default.signup));
/*----------------------------------
Login Router
-----------------------------------*/
router.post('/login', asyncHandler(authController_1.default.login));
/*----------------------------------
Google Login Router
-----------------------------------*/
router.post('/google', asyncHandler(authController_1.default.googleLogin));
/*----------------------------------
GitHub Login Router
-----------------------------------*/
router.get('/github', asyncHandler(authController_1.default.githubAuth));
router.get('/github/callback', asyncHandler(authController_1.default.githubLogin));
/*----------------------------------
Profile Routes
-----------------------------------*/
router.get('/profile', auth_1.auth, asyncHandler(authController_1.default.getProfile));
router.put('/profile', auth_1.auth, asyncHandler(authController_1.default.updateProfile));
router.put('/change-password', auth_1.auth, asyncHandler(authController_1.default.changePassword));
exports.default = router;

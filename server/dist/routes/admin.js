"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("../middleware/adminAuth");
const user_controller_1 = require("../controllers/user.controller");
const router = (0, express_1.Router)();
/* ---------------------------------------------
   FIX EXPRESS TYPESCRIPT RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*--------------------------------------------------
  Quản lý người dùng
--------------------------------------------------*/
router.get('/users', adminAuth_1.adminAuth, asyncHandler(user_controller_1.getAllUsers));
router.get('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.getUserById));
router.post('/users', adminAuth_1.adminAuth, asyncHandler(user_controller_1.createUser));
router.put('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.updateUser));
router.delete('/users/:id', adminAuth_1.adminAuth, asyncHandler(user_controller_1.deleteUser));
exports.default = router;

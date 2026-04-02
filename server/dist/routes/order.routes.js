"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const order_controller_2 = require("../controllers/order.controller");
const adminAuth_1 = require("../middleware/adminAuth");
const auth_1 = require("../types/auth");
const router = express_1.default.Router();
/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/*----------------------------------
   Tạo order
-----------------------------------*/
router.post('/', asyncHandler(order_controller_2.createOrder));
/*----------------------------------
   Admin lấy toàn bộ order
-----------------------------------*/
router.get('/', adminAuth_1.adminAuth, asyncHandler(order_controller_2.getAllOrders));
/*----------------------------------
    Admin lấy tổng quan doanh thu
-----------------------------------*/
router.get('/revenue/summary', adminAuth_1.adminAuth, asyncHandler(order_controller_2.getRevenueSummary));
/*----------------------------------
  Admin update trạng thái đơn hàng
-----------------------------------*/
router.put('/:id', adminAuth_1.adminAuth, asyncHandler(order_controller_2.updateOrderStatus));
/*----------------------------------
   User lấy order theo email
-----------------------------------*/
router.get('/user/:email', auth_1.auth, asyncHandler(order_controller_2.getUserOrders));
/*----------------------------------
   User hủy đơn pending của chính mình
-----------------------------------*/
router.put('/user/:id/cancel', auth_1.auth, asyncHandler(order_controller_2.cancelUserOrder));
/*----------------------------------
   User xóa đơn đã giao/đã hủy của chính mình
-----------------------------------*/
router.delete('/user/:id', auth_1.auth, asyncHandler(order_controller_2.deleteUserOrder));
/*----------------------------------
   MoMo IPN (callback từ MoMo)
-----------------------------------*/
router.post('/momo-ipn', asyncHandler(order_controller_1.momoIPN));
exports.default = router;

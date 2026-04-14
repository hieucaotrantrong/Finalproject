import express, { Request, Response } from 'express';
import { momoIPN, vnpayReturn } from '../controllers/order.controller';
import {
    createOrder,
    getAllOrders,
   getRevenueSummary,
    updateOrderStatus,
   getUserOrders,
   cancelUserOrder,
   deleteUserOrder
} from '../controllers/order.controller';
import { adminAuth } from '../middleware/adminAuth';
import { auth } from '../types/auth';

const router = express.Router();

/* ----------------------------------------------------
   FIX EXPRESS TS RETURN ERROR (KHÔNG TẠO FILE MỚI)
---------------------------------------------------- */
const asyncHandler = (fn: any) => {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/*----------------------------------
   Tạo order
-----------------------------------*/
router.post('/', asyncHandler(createOrder));

/*----------------------------------
   Admin lấy toàn bộ order
-----------------------------------*/
router.get('/', adminAuth, asyncHandler(getAllOrders));

/*----------------------------------
    Admin lấy tổng quan doanh thu
-----------------------------------*/
router.get('/revenue/summary', adminAuth, asyncHandler(getRevenueSummary));

/*----------------------------------
  Admin update trạng thái đơn hàng
-----------------------------------*/
router.put('/:id', adminAuth, asyncHandler(updateOrderStatus));

/*----------------------------------
   User lấy order theo email
-----------------------------------*/
router.get('/user/:email', auth, asyncHandler(getUserOrders));

/*----------------------------------
   User hủy đơn pending của chính mình
-----------------------------------*/
router.put('/user/:id/cancel', auth, asyncHandler(cancelUserOrder));

/*----------------------------------
   User xóa đơn đã giao/đã hủy của chính mình
-----------------------------------*/
router.delete('/user/:id', auth, asyncHandler(deleteUserOrder));

/*----------------------------------
   MoMo IPN (callback từ MoMo)
-----------------------------------*/
router.post('/momo-ipn', asyncHandler(momoIPN));

/*----------------------------------
   VNPay Return URL
-----------------------------------*/
router.get('/vnpay-return', asyncHandler(vnpayReturn));

export default router;

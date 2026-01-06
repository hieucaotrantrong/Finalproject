import express, { Request, Response } from 'express';
import {
    createOrder,
    getAllOrders,
    updateOrderStatus,
    getUserOrders
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
  Admin update trạng thái đơn hàng
-----------------------------------*/
router.put('/:id', adminAuth, asyncHandler(updateOrderStatus));

/*----------------------------------
   User lấy order theo email
-----------------------------------*/
router.get('/user/:email', auth, asyncHandler(getUserOrders));

export default router;

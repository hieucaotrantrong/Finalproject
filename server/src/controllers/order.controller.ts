import { Request, Response } from 'express';
import pool from "../config/database";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import { randomUUID } from "crypto";
/*-----------------------------------------
Create Order (COD + MoMo)
-------------------------------------------*/
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            fullName,
            email,
            phone,
            address,
            productId,
            productTitle,
            productPrice,
            quantity = 1,
            paymentMethod = "cod"
        } = req.body;

        // Validate
        if (!fullName || !email || !phone || !address || !productId || !productTitle || !productPrice) {
            res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
            return;
        }

        const totalAmount = productPrice * quantity;

        /*-----------------------------------------
        THANH TOÁN MOMO
        -------------------------------------------*/
        if (paymentMethod === "momo") {

            const partnerCode = "MOMO";
            const accessKey = "F8BBA842ECF85";
            const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

            const orderId = randomUUID();
            const requestId = orderId;
            const amount = totalAmount.toString();

            const redirectUrl = "http://localhost:3000/payment-result";
            const ipnUrl = "http://localhost:5000/api/orders/momo-ipn";

            const rawSignature =
                "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + productTitle +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + redirectUrl +
                "&requestId=" + requestId +
                "&requestType=captureWallet";

            const signature = crypto
                .createHmac("sha256", secretKey)
                .update(rawSignature)
                .digest("hex");

            // Lưu đơn trước khi gọi MoMo
            await pool.query(
                `INSERT INTO orders 
                (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','momo')`,
                [orderId, fullName, email, phone, address, productId, productTitle, productPrice, quantity]
            );

            try {
                // Gọi MoMo
                const momoPayload = {
                    partnerCode,
                    accessKey,
                    requestId,
                    amount,
                    orderId,
                    extraData: "",
                    orderInfo: productTitle,
                    redirectUrl,
                    ipnUrl,
                    requestType: "captureWallet",
                    signature,
                    lang: "vi",
                };

                const response = await axios.post(
                    "https://test-payment.momo.vn/v2/gateway/api/create",
                    momoPayload,
                    { timeout: 10000 }
                );

                const payUrl = response.data?.payUrl;
                if (!payUrl) {
                    res.status(502).json({
                        error: "MoMo không trả về link thanh toán",
                        momoResultCode: response.data?.resultCode,
                        momoMessage: response.data?.message,
                        subErrors: response.data?.subErrors || []
                    });
                    return;
                }

                res.json({
                    paymentMethod: "momo",
                    payUrl,
                    momoResultCode: response.data?.resultCode,
                    momoMessage: response.data?.message
                });
            } catch (momoError: any) {
                console.error("Lỗi gọi MoMo API:", {
                    status: momoError.response?.status,
                    resultCode: momoError.response?.data?.resultCode,
                    message: momoError.response?.data?.message,
                    subErrors: momoError.response?.data?.subErrors,
                    fullResponse: momoError.response?.data
                });

                res.status(502).json({
                    error: "Lỗi gọi MoMo API",
                    momoResultCode: momoError.response?.data?.resultCode,
                    momoMessage: momoError.response?.data?.message,
                    subErrors: momoError.response?.data?.subErrors || []
                });
            }
            return;
        }

        /*-----------------------------------------
        THANH TOÁN COD
        -------------------------------------------*/
        await pool.query(
            `INSERT INTO orders 
            (full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','cod')`,
            [fullName, email, phone, address, productId, productTitle, productPrice, quantity]
        );

        res.json({
            message: "Đặt hàng thành công (COD)",
            paymentMethod: "cod"
        });
        return;

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
        return;
    }
};


/*-----------------------------------------
MoMo IPN (callback từ MoMo)
-------------------------------------------*/
export const momoIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, resultCode } = req.body;

        if (resultCode === 0) {
            await pool.query(
                `UPDATE orders SET status = 'confirmed' WHERE id = $1`,
                [orderId]
            );
        }

        res.json({ message: "OK" });
    } catch (error) {
        console.error("Lỗi xử lý MoMo IPN:", error);
        res.status(500).json({ error: "IPN error" });
    }
};
/*-----------------------------------------
    Get all orders   
-------------------------------------------*/
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách đơn hàng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


/*-----------------------------------------
  Update order status  
-------------------------------------------*/
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: "Trạng thái không hợp lệ" });
            return;
        }

        // 🔥 LẤY FULL ORDER (thêm quantity + product_id + status)
        const orderResult = await pool.query(
            `SELECT * FROM orders WHERE id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            res.status(404).json({ error: "Không tìm thấy đơn hàng" });
            return;
        }

        const order = orderResult.rows[0];

        // 🚨 TRÁNH CỘNG LẠI
        if (order.status === "completed") {
            res.json({ message: "Đơn đã hoàn tất trước đó" });
            return;
        }

        // 🚀 CỘNG SOLD KHI HOÀN TẤT
        if (status === "completed") {
            await pool.query(
                `UPDATE products 
                 SET sold = sold + $1 
                 WHERE id = $2`,
                [order.quantity, order.product_id]
            );
        }

        // ✅ UPDATE STATUS
        await pool.query(
            `UPDATE orders SET status = $1 WHERE id = $2`,
            [status, id]
        );

        // 🔔 NOTIFICATION (giữ nguyên của bạn)
        await pool.query(
            `INSERT INTO notifications (user_email, title, message, is_read)
             VALUES ($1, $2, $3, FALSE)`,
            [
                order.email,
                `Cập nhật đơn hàng: ${order.product_title}`,
                `Đơn hàng của bạn đã được cập nhật sang trạng thái: ${status}`
            ]
        );

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công",
            order: { ...order, status }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

/*-----------------------------------------
  User cancel own pending order
-------------------------------------------*/
export const cancelUserOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
            return;
        }

        const userResult = await pool.query(
            `SELECT email FROM users WHERE id = $1`,
            [userId]
        );

        const userEmail = userResult.rows[0]?.email;
        if (!userEmail) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }

        const orderResult = await pool.query(
            `SELECT * FROM orders WHERE id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
            return;
        }

        const order = orderResult.rows[0];

        if (order.email !== userEmail) {
            res.status(403).json({ error: 'Bạn không có quyền thao tác đơn hàng này' });
            return;
        }

        if (order.status !== 'pending') {
            res.status(400).json({ error: 'Chỉ có thể hủy đơn ở trạng thái chờ xác nhận' });
            return;
        }

        await pool.query(
            `UPDATE orders SET status = 'cancelled' WHERE id = $1`,
            [id]
        );

        await pool.query(
            `INSERT INTO notifications (user_email, title, message, is_read)
             VALUES ($1, $2, $3, FALSE)`,
            [
                order.email,
                `Đơn hàng ${order.product_title}`,
                'Bạn đã hủy đơn hàng thành công.'
            ]
        );

        res.json({ message: 'Hủy đơn hàng thành công' });
    } catch (error) {
        console.error('Lỗi khi user hủy đơn:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

/*-----------------------------------------
  User delete own completed/cancelled order
-------------------------------------------*/
export const deleteUserOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
            return;
        }

        const userResult = await pool.query(
            `SELECT email FROM users WHERE id = $1`,
            [userId]
        );

        const userEmail = userResult.rows[0]?.email;
        if (!userEmail) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }

        const orderResult = await pool.query(
            `SELECT * FROM orders WHERE id = $1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
            return;
        }

        const order = orderResult.rows[0];

        if (order.email !== userEmail) {
            res.status(403).json({ error: 'Bạn không có quyền thao tác đơn hàng này' });
            return;
        }

        if (!['completed', 'cancelled'].includes(order.status)) {
            res.status(400).json({ error: 'Chỉ được xóa đơn đã giao hoặc đã hủy' });
            return;
        }

        await pool.query(
            `DELETE FROM orders WHERE id = $1`,
            [id]
        );

        res.json({ message: 'Xóa đơn hàng thành công' });
    } catch (error) {
        console.error('Lỗi khi user xóa đơn:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

/*-----------------------------------------
  Get user orders
-------------------------------------------*/
export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.params;

        const result = await pool.query(
            `SELECT o.*, p.image AS product_image
             FROM orders o
             LEFT JOIN products p ON p.id = o.product_id
             WHERE o.email = $1
             ORDER BY o.created_at DESC`,
            [email]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng user:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


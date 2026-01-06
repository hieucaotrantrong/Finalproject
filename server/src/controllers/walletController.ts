    import { Request, Response } from 'express';
    import pool from "../config/database";
    import jwt from "jsonwebtoken";

    /*-----------------------------------------
    Create order (wallet + COD)
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

            if (!fullName || !email || !phone || !address || !productId || !productTitle || !productPrice) {
                res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
                return;
            }

            const totalAmount = productPrice * quantity;

            /*-----------------------------------------
            THANH TOÁN BẰNG VÍ
            -------------------------------------------*/
            if (paymentMethod === "wallet") {
                const token = req.headers.authorization?.split(' ')[1];
                if (!token) {
                    res.status(401).json({ error: "Cần đăng nhập để thanh toán bằng ví" });
                    return;
                }

                const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                const userId = decoded.userId;

                // kiểm tra tồn tại ví
                const walletResult = await pool.query(
                    `SELECT id, balance FROM wallets WHERE user_id = $1`,
                    [userId]
                );

                const wallet = walletResult.rows[0];
                if (!wallet || wallet.balance < totalAmount) {
                    res.status(400).json({ error: "Số dư ví không đủ để thanh toán" });
                    return;
                }

                const walletId = wallet.id;

                // Start transaction
                const client = await pool.connect();
                try {
                    await client.query("BEGIN");

                    // Insert order
                    await client.query(
                        `INSERT INTO orders 
                        (full_name, email, phone, address, product_id, product_title, product_price, status, payment_method) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', 'wallet')`,
                        [fullName, email, phone, address, productId, productTitle, productPrice]
                    );

                    // trừ tiền ví
                    await client.query(
                        `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
                        [totalAmount, userId]
                    );

                    // Insert giao dịch ví đúng chuẩn
                    await client.query(
                        `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
                        VALUES ($1, 'payment', $2, $3)`,
                        [walletId, totalAmount, `Thanh toán đơn hàng: ${productTitle}`]
                    );

                    await client.query("COMMIT");

                    res.json({
                        message: "Đặt hàng & thanh toán thành công",
                        paymentMethod: "wallet",
                    });

                } catch (err) {
                    await client.query("ROLLBACK");
                    throw err;
                } finally {
                    client.release();
                }

            } else {
                /*-----------------------------------------
                    THANH TOÁN COD
                -------------------------------------------*/

                await pool.query(
                    `INSERT INTO orders 
                    (full_name, email, phone, address, product_id, product_title, product_price, status, payment_method)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'cod')`,
                    [fullName, email, phone, address, productId, productTitle, productPrice]
                );

                res.json({
                    message: "Đặt hàng thành công (COD)",
                    paymentMethod: "cod"
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Lỗi server" });
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

            const orderResult = await pool.query(
                `SELECT id, email, product_title FROM orders WHERE id = $1`,
                [id]
            );

            if (orderResult.rows.length === 0) {
                res.status(404).json({ error: "Không tìm thấy đơn hàng" });
                return;
            }

            const order = orderResult.rows[0];

            await pool.query(
                `UPDATE orders SET status = $1 WHERE id = $2`,
                [status, id]
            );

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
    Get user orders
    -------------------------------------------*/
    export const getUserOrders = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.params;

            const result = await pool.query(
                `SELECT * FROM orders WHERE email = $1 ORDER BY created_at DESC`,
                [email]
            );

            res.json(result.rows);

        } catch (error) {
            console.error("Lỗi khi lấy đơn hàng user:", error);
            res.status(500).json({ error: "Lỗi server" });
        }
    };

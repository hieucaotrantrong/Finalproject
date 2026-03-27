import { Request, Response } from "express";
import pool from "../config/database";
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

        if (!fullName || !email || !phone || !address || !productId || !productTitle || !productPrice) {
            res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
            return;
        }

        // ✅ fix ép kiểu
        const totalAmount = Number(productPrice) * Number(quantity);

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
            const ipnUrl = "http://localhost:5000/api/momo-ipn";

            // Tạo chữ ký theo thứ tự MoMo API
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

            await pool.query(
                `INSERT INTO orders 
                (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','momo')`,
                [orderId, fullName, email, phone, address, productId, productTitle, productPrice, quantity]
            );

            try {
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
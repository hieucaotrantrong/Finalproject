import { Request, Response } from 'express';
import pool from "../config/database";
import jwt from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { applyInventoryChange } from '../services/warehouse.service';
import transporter from '../config/mail';
import {
    calculateDiscountAmount,
    getActiveDiscountByCode,
    hasUserUsedDiscount,
    incrementDiscountUsage,
    normalizeDiscountCode
} from '../services/discount.service';

const STOCK_DEDUCT_STATUSES = new Set(['confirmed', 'shipping', 'completed']);
let hasOrdersShippingFeeColumn: boolean | null = null;
const sentOrderConfirmationEmails = new Set<string>();

const formatCurrencyVND = (value: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(value || 0);
};

const sendOrderConfirmationEmail = async (order: any): Promise<void> => {
    const orderId = String(order.id || '');
    const email = String(order.email || '').trim();

    if (!orderId || !email) {
        return;
    }

    const emailKey = `${orderId}:${email}`;
    if (sentOrderConfirmationEmails.has(emailKey)) {
        return;
    }

    const productTitle = String(order.product_title || 'Sản phẩm');
    const quantity = Number(order.quantity || 1);
    const productPrice = Number(order.product_price || 0);
    const shippingFee = Number(order.shipping_fee || 0);
    const totalAmount = productPrice * quantity + shippingFee;
    const paymentMethod = String(order.payment_method || 'cod').toUpperCase();
    const status = String(order.status || 'pending');

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Xác nhận đơn hàng #${orderId} - TdddWebsite`,
        text: [
            'TdddWebsite',
            '',
            `Xin chào ${order.full_name || ''},`,
            '',
            'Chúng tôi đã nhận được thông tin mua hàng của bạn. Dưới đây là chi tiết đơn hàng:',
            '',
            `Mã đơn: ${orderId}`,
            `Sản phẩm: ${productTitle}`,
            `Số lượng: ${quantity}`,
            `Đơn giá: ${formatCurrencyVND(productPrice)}`,
            `Phí ship: ${formatCurrencyVND(shippingFee)}`,
            `Tổng tiền: ${formatCurrencyVND(totalAmount)}`,
            `Thanh toán: ${paymentMethod}`,
            `Trạng thái: ${status}`,
            '',
            'Cảm ơn bạn đã mua hàng tại TdddWebsite.'
        ].join('\n'),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2>Đơn hàng của bạn đã được ghi nhận</h2>
                <p>Xin chào ${order.full_name || ''},</p>
                <p>Chúng tôi đã nhận được thông tin mua hàng của bạn. Dưới đây là chi tiết đơn hàng:</p>
                <ul>
                    <li>Mã đơn: ${orderId}</li>
                    <li>Sản phẩm: ${productTitle}</li>
                    <li>Số lượng: ${quantity}</li>
                    <li>Đơn giá: ${formatCurrencyVND(productPrice)}</li>
                    <li>Phí ship: ${formatCurrencyVND(shippingFee)}</li>
                    <li>Tổng tiền: ${formatCurrencyVND(totalAmount)}</li>
                    <li>Thanh toán: ${paymentMethod}</li>
                    <li>Trạng thái: ${status}</li>
                </ul>
                <p>Cảm ơn bạn đã mua hàng tại TdddWebsite.</p>
            </div>
        `
    });

    sentOrderConfirmationEmails.add(emailKey);
};

const trySendOrderConfirmationEmail = async (order: any): Promise<void> => {
    try {
        await sendOrderConfirmationEmail(order);
    } catch (error) {
        console.error('Không thể gửi email xác nhận đơn hàng:', error);
    }
};

const ensureOrdersShippingFeeColumn = async (): Promise<boolean> => {
    if (hasOrdersShippingFeeColumn !== null) {
        return hasOrdersShippingFeeColumn;
    }

    const columnCheck = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'orders'
           AND column_name = 'shipping_fee'
         LIMIT 1`
    );

    hasOrdersShippingFeeColumn = columnCheck.rows.length > 0;

    // Tự bổ sung cột nếu thiếu để không làm mất phí ship khi lưu đơn.
    if (!hasOrdersShippingFeeColumn) {
        await pool.query(
            `ALTER TABLE orders
             ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0`
        );
        hasOrdersShippingFeeColumn = true;
    }

    return hasOrdersShippingFeeColumn;
};

const formatVNPayDate = (date: Date = new Date()): string => {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = vnDate.getUTCFullYear();
    const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnDate.getUTCDate()).padStart(2, '0');
    const hh = String(vnDate.getUTCHours()).padStart(2, '0');
    const mi = String(vnDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(vnDate.getUTCSeconds()).padStart(2, '0');

    return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};

const buildVNPaySignData = (params: Record<string, string>): string => {
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys
        .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
        .join('&');
};

const resolveClientReturnUrl = (rawUrl: string | undefined): string => {
    if (typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }

    return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
};

const buildRedirectUrl = (baseUrl: string, params: Record<string, string>): string => {
    try {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    } catch {
        return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
    }
};

const getAdminEmails = async (): Promise<string[]> => {
    try {
        const result = await pool.query(
            `SELECT email FROM users WHERE role = 'admin'`
        );

        return result.rows
            .map((row: any) => row.email)
            .filter((email: string) => Boolean(email));
    } catch (error) {
        console.error('Lỗi khi lấy admin emails:', error);
        return [];
    }
};

const notifyAdminsNewOrder = async (
    orderEmail: string,
    productTitle: string,
    quantity: number,
    paymentMethod: string
): Promise<void> => {
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
        return;
    }

    const title = 'Đơn hàng mới';
    const message = `Khách ${orderEmail} vừa đặt ${quantity} x ${productTitle} (${paymentMethod.toUpperCase()}).`;

    await pool.query(
        `INSERT INTO notifications (user_email, title, message, is_read)
         SELECT email, $1, $2, FALSE
         FROM unnest($3::text[]) AS email`,
        [title, message, adminEmails]
    );
};
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
            shippingFee = 0,
            discountCode = null,
            paymentMethod = "cod",
            returnUrl
        } = req.body;
        const userId = Number(req.user?.userId || 0);

        // Validate
        if (!fullName || !email || !phone || !address || !productId || !productTitle || !productPrice) {
            res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
            return;
        }

        if (!userId) {
            res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
            return;
        }

        const normalizedProductPrice = Number(productPrice) || 0;
        const normalizedQuantity = Number(quantity) || 1;
        const normalizedShippingFee = Number(shippingFee) || 0;
        const normalizedPaymentMethod = String(paymentMethod || '').toLowerCase();
        const allowedPaymentMethods = new Set(['cod', 'momo', 'vnpay']);
        const normalizedDiscountCode = normalizeDiscountCode(discountCode);
        const resolvedDiscountCode = normalizedDiscountCode || null;
        let resolvedDiscountAmount = 0;
        let resolvedDiscountId: number | null = null;

        if (!allowedPaymentMethods.has(normalizedPaymentMethod)) {
            res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ' });
            return;
        }

        if (normalizedProductPrice <= 0 || normalizedQuantity <= 0 || normalizedShippingFee < 0) {
            res.status(400).json({ error: "Dữ liệu tiền đơn hàng không hợp lệ" });
            return;
        }

        if (normalizedDiscountCode) {
            const discount = await getActiveDiscountByCode(normalizedDiscountCode);

            if (!discount) {
                res.status(404).json({ error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
                return;
            }

            if (discount.expiry_date && new Date(discount.expiry_date) < new Date()) {
                res.status(400).json({ error: 'Mã giảm giá đã hết hạn' });
                return;
            }

            if (discount.max_uses !== null && Number(discount.current_uses || 0) >= Number(discount.max_uses)) {
                res.status(400).json({ error: 'Mã giảm giá đã hết lượt sử dụng' });
                return;
            }

            const usedBefore = await hasUserUsedDiscount(userId, discount.code);
            if (usedBefore) {
                res.status(400).json({ error: 'Bạn đã sử dụng mã giảm giá này rồi' });
                return;
            }

            const cartTotal = normalizedProductPrice * normalizedQuantity;
            if (cartTotal < discount.min_amount) {
                res.status(400).json({
                    error: `Mã giảm giá yêu cầu tối thiểu ${discount.min_amount.toLocaleString('vi-VN')} đ`
                });
                return;
            }

            resolvedDiscountAmount = calculateDiscountAmount(discount, cartTotal);
            resolvedDiscountId = discount.id;
        }

        const productCheck = await pool.query(
            `SELECT
                p.id,
                p.title,
                p.is_out_of_stock,
                COALESCE(inv.quantity, 0)::int AS stock_quantity
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             WHERE p.id = $1
             LIMIT 1`,
            [productId]
        );

        if (productCheck.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        if (Boolean(productCheck.rows[0]?.is_out_of_stock)) {
            res.status(400).json({ error: 'Sản phẩm đã hết hàng, không thể đặt mua' });
            return;
        }

        const availableStock = Number(productCheck.rows[0]?.stock_quantity || 0);
        if (availableStock < normalizedQuantity) {
            res.status(400).json({
                error: `Sản phẩm không đủ tồn kho. Hiện còn ${availableStock}, yêu cầu ${normalizedQuantity}`
            });
            return;
        }

        const totalAmount = normalizedProductPrice * normalizedQuantity + normalizedShippingFee - resolvedDiscountAmount;

        // Validate totalAmount
        if ((normalizedPaymentMethod === 'momo' || normalizedPaymentMethod === 'vnpay') && totalAmount < 1000) {
            res.status(400).json({ 
                error: "Số tiền sau giảm giá quá thấp. Số tiền thanh toán phải >= 1000 VND" 
            });
            return;
        }

        const supportShippingFeeColumn = await ensureOrdersShippingFeeColumn();
        const onlineInitialStatus = 'pending';

        /*-----------------------------------------
        THANH TOÁN MOMO
        -------------------------------------------*/
        if (normalizedPaymentMethod === "momo") {

            const partnerCode = "MOMO";
            const accessKey = "F8BBA842ECF85";
            const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

            const orderId = randomUUID();
            const requestId = orderId;
            const amount = totalAmount.toString();

            const isValidReturnUrl =
                typeof returnUrl === "string" &&
                /^https?:\/\//i.test(returnUrl);

            const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
            const clientReturnUrl = isValidReturnUrl
                ? returnUrl
                : `${process.env.FRONTEND_URL || "http://localhost:5173"}/orders`;
            const redirectUrl = `${backendUrl}/api/orders/momo-return?clientReturnUrl=${encodeURIComponent(clientReturnUrl)}`;
            const ipnUrl = `${backendUrl}/api/orders/momo-ipn`;

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
            if (supportShippingFeeColumn) {
                await pool.query(
                    `INSERT INTO orders 
                    (id, user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, discount_code, discount_amount, payment_confirmed, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'momo')`,
                    [
                        orderId,
                        userId,
                        fullName,
                        email,
                        phone,
                        address,
                        productId,
                        productTitle,
                        normalizedProductPrice,
                        normalizedQuantity,
                        normalizedShippingFee,
                        resolvedDiscountCode,
                        resolvedDiscountAmount,
                        false,
                        onlineInitialStatus
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO orders 
                    (id, user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, discount_code, discount_amount, payment_confirmed, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'momo')`,
                    [
                        orderId,
                        userId,
                        fullName,
                        email,
                        phone,
                        address,
                        productId,
                        productTitle,
                        normalizedProductPrice,
                        normalizedQuantity,
                        resolvedDiscountCode,
                        resolvedDiscountAmount,
                        false,
                        onlineInitialStatus
                    ]
                );
            }

            if (resolvedDiscountId !== null) {
                await incrementDiscountUsage(resolvedDiscountId);
            }

            // ⚠️ KHÔNG gọi notifyAdminsNewOrder ở đây
            // Chỉ gọi khi callback từ MoMo thành công (momoIPN hoặc momoReturn)

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
        THANH TOÁN VNPAY
        -------------------------------------------*/
        if (normalizedPaymentMethod === "vnpay") {
            const vnpTmnCode = process.env.VNP_TMN_CODE || "ZF2ENMU8";
            const vnpHashSecret = process.env.VNP_HASH_SECRET || "E60GR73NEC2MI25E48TF7M0QNI6CVGVR";
            const vnpUrl = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
            const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

            const orderId = randomUUID();
            const amount = Math.round(totalAmount * 100);
            const clientIp = (
                (req.headers['x-forwarded-for'] as string) ||
                req.socket.remoteAddress ||
                req.ip ||
                '127.0.0.1'
            )
                .toString()
                .split(',')[0]
                .trim();

            const clientReturnUrl = resolveClientReturnUrl(returnUrl);
            const vnpReturnUrl = `${backendUrl}/api/orders/vnpay-return?clientReturnUrl=${encodeURIComponent(clientReturnUrl)}`;

            if (supportShippingFeeColumn) {
                await pool.query(
                    `INSERT INTO orders
                    (id, user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, discount_code, discount_amount, payment_confirmed, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'vnpay')`,
                    [
                        orderId,
                        userId,
                        fullName,
                        email,
                        phone,
                        address,
                        productId,
                        productTitle,
                        normalizedProductPrice,
                        normalizedQuantity,
                        normalizedShippingFee,
                        resolvedDiscountCode || null,
                        resolvedDiscountAmount,
                        false,
                        onlineInitialStatus
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO orders
                    (id, user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, discount_code, discount_amount, payment_confirmed, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'vnpay')`,
                    [
                        orderId,
                        userId,
                        fullName,
                        email,
                        phone,
                        address,
                        productId,
                        productTitle,
                        normalizedProductPrice,
                        normalizedQuantity,
                        resolvedDiscountCode || null,
                        resolvedDiscountAmount,
                        false,
                        onlineInitialStatus
                    ]
                );
            }

            if (resolvedDiscountId !== null) {
                await incrementDiscountUsage(resolvedDiscountId);
            }

            // ⚠️ KHÔNG gọi notifyAdminsNewOrder ở đây
            // Chỉ gọi khi callback từ VNPay thành công (vnpayReturn)

            const params: Record<string, string> = {
                vnp_Version: '2.1.0',
                vnp_Command: 'pay',
                vnp_TmnCode: vnpTmnCode,
                vnp_Locale: 'vn',
                vnp_CurrCode: 'VND',
                vnp_TxnRef: orderId,
                vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
                vnp_OrderType: 'other',
                vnp_Amount: String(amount),
                vnp_ReturnUrl: vnpReturnUrl,
                vnp_IpAddr: clientIp,
                vnp_CreateDate: formatVNPayDate(),
                vnp_ExpireDate: formatVNPayDate(new Date(Date.now() + 15 * 60 * 1000))
            };

            const signData = buildVNPaySignData(params);
            const secureHash = crypto
                .createHmac('sha512', vnpHashSecret)
                .update(signData)
                .digest('hex');

            const payUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

            res.json({
                paymentMethod: 'vnpay',
                payUrl
            });
            return;
        }

        /*-----------------------------------------
        THANH TOÁN COD
        -------------------------------------------*/
        if (supportShippingFeeColumn) {
            const createdOrder = await pool.query(
                `INSERT INTO orders 
                (user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, discount_code, discount_amount, payment_confirmed, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,'pending','cod')
                RETURNING *`,
                [
                    userId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    normalizedShippingFee,
                    resolvedDiscountCode || null,
                    resolvedDiscountAmount
                ]
            );

            if (resolvedDiscountId !== null) {
                await incrementDiscountUsage(resolvedDiscountId);
            }

            await trySendOrderConfirmationEmail(createdOrder.rows[0]);
        } else {
            const createdOrder = await pool.query(
                `INSERT INTO orders 
                (user_id, full_name, email, phone, address, product_id, product_title, product_price, quantity, discount_code, discount_amount, payment_confirmed, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,'pending','cod')
                RETURNING *`,
                [
                    userId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    resolvedDiscountCode || null,
                    resolvedDiscountAmount
                ]
            );

            if (resolvedDiscountId !== null) {
                await incrementDiscountUsage(resolvedDiscountId);
            }

            await trySendOrderConfirmationEmail(createdOrder.rows[0]);
        }

        await notifyAdminsNewOrder(
            email,
            productTitle,
            normalizedQuantity,
            'cod'
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
    const client = await pool.connect();

    try {
        const { orderId, resultCode } = req.body;
        const isSuccess = Number(resultCode) === 0;
        let orderForMail: any = null;

        await client.query('BEGIN');

        if (isSuccess) {
            const orderResult = await client.query(
                `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
                [orderId]
            );

            if (orderResult.rows.length > 0) {
                const order = orderResult.rows[0];

                if (!order.inventory_deducted) {
                    await applyInventoryChange(client, {
                        productId: Number(order.product_id),
                        quantityDelta: -Number(order.quantity || 1),
                        changeType: 'sale',
                        reason: 'Trừ kho từ MoMo IPN',
                        referenceType: 'order',
                        referenceId: String(order.id),
                        actorUserId: null
                    });

                    await client.query(
                        `UPDATE orders
                         SET inventory_deducted = TRUE
                         WHERE id = $1`,
                        [orderId]
                    );
                }

                // Chỉ chuyển sang pending sau khi thanh toán thành công để đơn online không hiện sớm trong lịch sử.
                await client.query(
                    `UPDATE orders SET status = 'pending' WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                orderForMail = {
                    ...order,
                    status: 'pending'
                };
            }
        } else {
            await client.query(
                `UPDATE orders
                 SET status = 'cancelled'
                 WHERE id = $1`,
                [orderId]
            );
        }

        await client.query('COMMIT');

        if (orderForMail) {
            // ✅ Gọi notifyAdminsNewOrder khi thanh toán MoMo thành công
            await notifyAdminsNewOrder(
                orderForMail.email,
                orderForMail.product_title,
                orderForMail.quantity,
                'momo'
            );
            await trySendOrderConfirmationEmail(orderForMail);
        }

        res.json({ message: "OK" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi xử lý MoMo IPN:", error);
        res.status(500).json({ error: "IPN error" });
    } finally {
        client.release();
    }
};

/*-----------------------------------------
MoMo Return URL (callback browser redirect)
-------------------------------------------*/
export const momoReturn = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const orderId = String(req.query.orderId || '');
        const resultCode = String(req.query.resultCode || '');
        const isSuccess = resultCode === '0';
        const clientReturnUrl = resolveClientReturnUrl(
            typeof req.query.clientReturnUrl === 'string' ? req.query.clientReturnUrl : undefined
        );

        let orderForNotification: any = null;

        await client.query('BEGIN');

        const orderResult = await client.query(
            `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
            [orderId]
        );

        if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];

            if (isSuccess) {
                if (!order.inventory_deducted) {
                    await applyInventoryChange(client, {
                        productId: Number(order.product_id),
                        quantityDelta: -Number(order.quantity || 1),
                        changeType: 'sale',
                        reason: 'Trừ kho từ MoMo return',
                        referenceType: 'order',
                        referenceId: String(order.id),
                        actorUserId: null
                    });

                    await client.query(
                        `UPDATE orders
                         SET inventory_deducted = TRUE
                         WHERE id = $1`,
                        [orderId]
                    );
                }

                await client.query(
                    `UPDATE orders SET status = 'pending' WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                await client.query('COMMIT');

                orderForNotification = {
                    ...order,
                    status: 'pending'
                };

                // ✅ Gọi notifyAdminsNewOrder khi thanh toán MoMo return thành công
                await notifyAdminsNewOrder(
                    orderForNotification.email,
                    orderForNotification.product_title,
                    orderForNotification.quantity,
                    'momo'
                );

                await trySendOrderConfirmationEmail(orderForNotification);
            } else {
                await client.query(
                    `UPDATE orders
                     SET status = 'cancelled'
                     WHERE id = $1`,
                    [orderId]
                );
                await client.query('COMMIT');
            }
        } else {
            await client.query('COMMIT');
        }

        const redirectUrl = buildRedirectUrl(clientReturnUrl, {
            payment: 'momo',
            status: isSuccess ? 'success' : 'failed',
            orderId,
            code: resultCode || 'unknown'
        });

        res.redirect(redirectUrl);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi xử lý MoMo return:', error);

        const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
        const redirectUrl = buildRedirectUrl(fallbackUrl, {
            payment: 'momo',
            status: 'failed',
            reason: 'server-error'
        });
        res.redirect(redirectUrl);
    } finally {
        client.release();
    }
};

/*-----------------------------------------
VNPay Return URL (callback browser redirect)
-------------------------------------------*/
export const vnpayReturn = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const vnpHashSecret = process.env.VNP_HASH_SECRET || "E60GR73NEC2MI25E48TF7M0QNI6CVGVR";
        const secureHash = String(req.query.vnp_SecureHash || '');
        const clientReturnUrl = resolveClientReturnUrl(
            typeof req.query.clientReturnUrl === 'string' ? req.query.clientReturnUrl : undefined
        );

        const vnpParams: Record<string, string> = {};
        Object.entries(req.query).forEach(([key, value]) => {
            if (!key.startsWith('vnp_')) return;
            if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') return;

            const normalizedValue = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
            vnpParams[key] = normalizedValue;
        });

        const signData = buildVNPaySignData(vnpParams);
        const expectedHash = crypto
            .createHmac('sha512', vnpHashSecret)
            .update(signData)
            .digest('hex');

        if (!secureHash || secureHash !== expectedHash) {
            const redirectUrl = buildRedirectUrl(clientReturnUrl, {
                payment: 'vnpay',
                status: 'failed',
                reason: 'invalid-signature'
            });
            res.redirect(redirectUrl);
            return;
        }

        const orderId = String(vnpParams.vnp_TxnRef || '');
        const responseCode = String(vnpParams.vnp_ResponseCode || '');
        const transactionStatus = String(vnpParams.vnp_TransactionStatus || '');
        const isSuccess = responseCode === '00' && transactionStatus === '00';
        let orderForMail: any = null;

        await client.query('BEGIN');

        const orderResult = await client.query(
            `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
            [orderId]
        );

        if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];

            if (isSuccess) {
                if (!order.inventory_deducted) {
                    await applyInventoryChange(client, {
                        productId: Number(order.product_id),
                        quantityDelta: -Number(order.quantity || 1),
                        changeType: 'sale',
                        reason: 'Trừ kho từ VNPay callback',
                        referenceType: 'order',
                        referenceId: String(order.id),
                        actorUserId: null
                    });

                    await client.query(
                        `UPDATE orders
                         SET inventory_deducted = TRUE
                         WHERE id = $1`,
                        [orderId]
                    );
                }

                // Giữ trạng thái pending để admin xác nhận thủ công sau khi đã thanh toán.
                await client.query(
                    `UPDATE orders SET status = 'pending' WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                await client.query(
                    `UPDATE orders SET payment_confirmed = TRUE WHERE id = $1`,
                    [orderId]
                );

                orderForMail = {
                    ...order,
                    status: 'pending'
                };
            } else {
                await client.query(
                    `UPDATE orders
                     SET status = 'cancelled'
                     WHERE id = $1`,
                    [orderId]
                );
            }
        }

        await client.query('COMMIT');

        if (orderForMail) {
            // ✅ Gọi notifyAdminsNewOrder khi thanh toán VNPay thành công
            await notifyAdminsNewOrder(
                orderForMail.email,
                orderForMail.product_title,
                orderForMail.quantity,
                'vnpay'
            );
            await trySendOrderConfirmationEmail(orderForMail);
        }

        const redirectUrl = buildRedirectUrl(clientReturnUrl, {
            payment: 'vnpay',
            status: isSuccess ? 'success' : 'failed',
            orderId,
            code: responseCode || 'unknown'
        });

        res.redirect(redirectUrl);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi xử lý VNPay return:', error);

        const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
        const redirectUrl = buildRedirectUrl(fallbackUrl, {
            payment: 'vnpay',
            status: 'failed',
            reason: 'server-error'
        });
        res.redirect(redirectUrl);
    } finally {
        client.release();
    }
};
/*-----------------------------------------
    Get all orders   
-------------------------------------------*/
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM orders
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách đơn hàng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

/*-----------------------------------------
  Admin revenue summary
-------------------------------------------*/
export const getRevenueSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const from = typeof req.query.from === "string" ? req.query.from : undefined;
        const to = typeof req.query.to === "string" ? req.query.to : undefined;

        const dateConditions: string[] = [];
        const values: any[] = [];

        if (from) {
            values.push(from);
            dateConditions.push(`created_at::date >= $${values.length}`);
        }

        if (to) {
            values.push(to);
            dateConditions.push(`created_at::date <= $${values.length}`);
        }

        const allWhereClause = dateConditions.length
            ? `WHERE ${dateConditions.join(" AND ")}`
            : "";

        const completedWhereClause = dateConditions.length
            ? `WHERE status = 'completed' AND ${dateConditions.join(" AND ")}`
            : `WHERE status = 'completed'`;

        const summaryQuery = `
            SELECT
                COALESCE(SUM((product_price::numeric) * COALESCE(quantity, 1)), 0) AS total_revenue,
                COUNT(*)::int AS completed_orders,
                COALESCE(SUM(COALESCE(quantity, 1)), 0)::int AS total_items,
                COALESCE(AVG((product_price::numeric) * COALESCE(quantity, 1)), 0) AS average_order_value
            FROM orders
            ${completedWhereClause}
        `;

        const byDateQuery = `
            SELECT
                created_at::date AS day,
                COALESCE(SUM((product_price::numeric) * COALESCE(quantity, 1)), 0) AS revenue,
                COUNT(*)::int AS orders
            FROM orders
            ${completedWhereClause}
            GROUP BY created_at::date
            ORDER BY day DESC
        `;

        const orderStatsQuery = `
            SELECT
                COUNT(*)::int AS total_orders,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_orders
            FROM orders
            ${allWhereClause}
        `;

        const [summaryResult, byDateResult, orderStatsResult] = await Promise.all([
            pool.query(summaryQuery, values),
            pool.query(byDateQuery, values),
            pool.query(orderStatsQuery, values)
        ]);

        const summary = summaryResult.rows[0] || {
            total_revenue: 0,
            completed_orders: 0,
            total_items: 0,
            average_order_value: 0
        };

        const orderStats = orderStatsResult.rows[0] || {
            total_orders: 0,
            completed_orders: 0
        };

        const totalOrders = Number(orderStats.total_orders || 0);
        const completedOrders = Number(orderStats.completed_orders || 0);
        const incompleteOrders = Math.max(totalOrders - completedOrders, 0);
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        res.json({
            summary: {
                totalRevenue: Number(summary.total_revenue || 0),
                completedOrders: Number(summary.completed_orders || 0),
                totalItems: Number(summary.total_items || 0),
                averageOrderValue: Number(summary.average_order_value || 0),
                totalOrders,
                incompleteOrders,
                completionRate
            },
            byDate: (byDateResult.rows || []).map((row) => ({
                day: row.day,
                revenue: Number(row.revenue || 0),
                orders: Number(row.orders || 0)
            }))
        });
    } catch (error) {
        console.error("Lỗi khi lấy tổng quan doanh thu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


/*-----------------------------------------
  Update order status  
-------------------------------------------*/
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: "Trạng thái không hợp lệ" });
            return;
        }

        await client.query('BEGIN');

        const orderResult = await client.query(
            `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: "Không tìm thấy đơn hàng" });
            return;
        }

        const order = orderResult.rows[0];
        const currentStatus = String(order.status || 'pending');

        if (currentStatus === status) {
            await client.query('ROLLBACK');
            res.json({ message: 'Trạng thái không thay đổi', order });
            return;
        }

        const shouldDeductStock = STOCK_DEDUCT_STATUSES.has(status) && !Boolean(order.inventory_deducted);
        const shouldRestoreStock = status === 'cancelled' && Boolean(order.inventory_deducted);

        if (shouldDeductStock) {
            await applyInventoryChange(client, {
                productId: Number(order.product_id),
                quantityDelta: -Number(order.quantity || 1),
                changeType: 'sale',
                reason: `Trừ kho theo đơn ${order.id}`,
                referenceType: 'order',
                referenceId: String(order.id),
                actorUserId: null
            });
        }

        if (shouldRestoreStock) {
            await applyInventoryChange(client, {
                productId: Number(order.product_id),
                quantityDelta: Number(order.quantity || 1),
                changeType: 'cancel_restore',
                reason: `Hoàn kho do hủy đơn ${order.id}`,
                referenceType: 'order',
                referenceId: String(order.id),
                actorUserId: null
            });
        }

        if (status === "completed" && currentStatus !== 'completed') {
            await client.query(
                `UPDATE products 
                 SET sold = sold + $1 
                 WHERE id = $2`,
                [order.quantity, order.product_id]
            );
        }

        await client.query(
            `UPDATE orders
             SET status = $1,
                 inventory_deducted = CASE
                    WHEN $2 THEN FALSE
                    WHEN $3 THEN TRUE
                    ELSE inventory_deducted
                 END
             WHERE id = $4`,
            [status, status === 'cancelled', shouldDeductStock, id]
        );

        await client.query(
            `INSERT INTO notifications (user_email, title, message, is_read)
             VALUES ($1, $2, $3, FALSE)`,
            [
                order.email,
                `Cập nhật đơn hàng: ${order.product_title}`,
                `Đơn hàng của bạn đã được cập nhật sang trạng thái: ${status}`
            ]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công",
            order: {
                ...order,
                status,
                inventory_deducted: status === 'cancelled' ? false : (shouldDeductStock ? true : Boolean(order.inventory_deducted))
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Lỗi server" });
    } finally {
        client.release();
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
             WHERE o.email = $1 AND COALESCE(o.payment_confirmed, true) = true
             ORDER BY o.created_at DESC`,
            [email]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng user:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};


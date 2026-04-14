"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserOrders = exports.deleteUserOrder = exports.cancelUserOrder = exports.updateOrderStatus = exports.getRevenueSummary = exports.getAllOrders = exports.vnpayReturn = exports.momoIPN = exports.createOrder = void 0;
const database_1 = __importDefault(require("../config/database"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const crypto_2 = require("crypto");
const warehouse_service_1 = require("../services/warehouse.service");
const STOCK_DEDUCT_STATUSES = new Set(['confirmed', 'shipping', 'completed']);
let hasOrdersShippingFeeColumn = null;
let supportsAwaitingPaymentStatus = null;
const ensureOrdersShippingFeeColumn = () => __awaiter(void 0, void 0, void 0, function* () {
    if (hasOrdersShippingFeeColumn !== null) {
        return hasOrdersShippingFeeColumn;
    }
    const columnCheck = yield database_1.default.query(`SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'orders'
           AND column_name = 'shipping_fee'
         LIMIT 1`);
    hasOrdersShippingFeeColumn = columnCheck.rows.length > 0;
    // Tự bổ sung cột nếu thiếu để không làm mất phí ship khi lưu đơn.
    if (!hasOrdersShippingFeeColumn) {
        yield database_1.default.query(`ALTER TABLE orders
             ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0`);
        hasOrdersShippingFeeColumn = true;
    }
    return hasOrdersShippingFeeColumn;
});
const ensureOrdersStatusSupportsAwaitingPayment = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (supportsAwaitingPaymentStatus !== null) {
        return supportsAwaitingPaymentStatus;
    }
    const constraintResult = yield database_1.default.query(`SELECT
            c.conname,
            pg_get_constraintdef(c.oid) AS definition
         FROM pg_constraint c
         INNER JOIN pg_class t ON t.oid = c.conrelid
         INNER JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE n.nspname = 'public'
           AND t.relname = 'orders'
           AND c.conname = 'orders_status_check'
         LIMIT 1`);
    if (constraintResult.rows.length === 0) {
        supportsAwaitingPaymentStatus = true;
        return supportsAwaitingPaymentStatus;
    }
    const currentDefinition = String(((_a = constraintResult.rows[0]) === null || _a === void 0 ? void 0 : _a.definition) || '').toLowerCase();
    if (currentDefinition.includes('awaiting_payment')) {
        supportsAwaitingPaymentStatus = true;
        return supportsAwaitingPaymentStatus;
    }
    try {
        yield database_1.default.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check`);
        yield database_1.default.query(`ALTER TABLE orders
             ADD CONSTRAINT orders_status_check
             CHECK (
                 status = ANY (
                     ARRAY[
                         'pending',
                         'confirmed',
                         'shipping',
                         'completed',
                         'cancelled',
                         'awaiting_payment'
                     ]::text[]
                 )
             )`);
        supportsAwaitingPaymentStatus = true;
    }
    catch (error) {
        console.error('Không thể cập nhật orders_status_check, fallback về pending cho thanh toán online:', error);
        supportsAwaitingPaymentStatus = false;
    }
    return supportsAwaitingPaymentStatus;
});
const formatVNPayDate = (date = new Date()) => {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = vnDate.getUTCFullYear();
    const mm = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnDate.getUTCDate()).padStart(2, '0');
    const hh = String(vnDate.getUTCHours()).padStart(2, '0');
    const mi = String(vnDate.getUTCMinutes()).padStart(2, '0');
    const ss = String(vnDate.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
};
const buildVNPaySignData = (params) => {
    const sortedKeys = Object.keys(params).sort();
    return sortedKeys
        .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
        .join('&');
};
const resolveClientReturnUrl = (rawUrl) => {
    if (typeof rawUrl === 'string' && /^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }
    return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
};
const buildRedirectUrl = (baseUrl, params) => {
    try {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    }
    catch (_a) {
        return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
    }
};
const getAdminEmails = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT email FROM users WHERE role = 'admin'`);
        return result.rows
            .map((row) => row.email)
            .filter((email) => Boolean(email));
    }
    catch (error) {
        console.error('Lỗi khi lấy admin emails:', error);
        return [];
    }
});
const notifyAdminsNewOrder = (orderEmail, productTitle, quantity, paymentMethod) => __awaiter(void 0, void 0, void 0, function* () {
    const adminEmails = yield getAdminEmails();
    if (adminEmails.length === 0) {
        return;
    }
    const title = 'Đơn hàng mới';
    const message = `Khách ${orderEmail} vừa đặt ${quantity} x ${productTitle} (${paymentMethod.toUpperCase()}).`;
    yield database_1.default.query(`INSERT INTO notifications (user_email, title, message, is_read)
         SELECT email, $1, $2, FALSE
         FROM unnest($3::text[]) AS email`, [title, message, adminEmails]);
});
/*-----------------------------------------
Create Order (COD + MoMo)
-------------------------------------------*/
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    try {
        const { fullName, email, phone, address, productId, productTitle, productPrice, quantity = 1, shippingFee = 0, paymentMethod = "cod", returnUrl } = req.body;
        // Validate
        if (!fullName || !email || !phone || !address || !productId || !productTitle || !productPrice) {
            res.status(400).json({ error: "Thiếu thông tin đơn hàng" });
            return;
        }
        const normalizedProductPrice = Number(productPrice) || 0;
        const normalizedQuantity = Number(quantity) || 1;
        const normalizedShippingFee = Number(shippingFee) || 0;
        const normalizedPaymentMethod = String(paymentMethod || '').toLowerCase();
        const allowedPaymentMethods = new Set(['cod', 'momo', 'vnpay']);
        if (!allowedPaymentMethods.has(normalizedPaymentMethod)) {
            res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ' });
            return;
        }
        if (normalizedProductPrice <= 0 || normalizedQuantity <= 0 || normalizedShippingFee < 0) {
            res.status(400).json({ error: "Dữ liệu tiền đơn hàng không hợp lệ" });
            return;
        }
        const productCheck = yield database_1.default.query(`SELECT
                p.id,
                p.title,
                p.is_out_of_stock,
                COALESCE(inv.quantity, 0)::int AS stock_quantity
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             WHERE p.id = $1
             LIMIT 1`, [productId]);
        if (productCheck.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        if (Boolean((_a = productCheck.rows[0]) === null || _a === void 0 ? void 0 : _a.is_out_of_stock)) {
            res.status(400).json({ error: 'Sản phẩm đã hết hàng, không thể đặt mua' });
            return;
        }
        const availableStock = Number(((_b = productCheck.rows[0]) === null || _b === void 0 ? void 0 : _b.stock_quantity) || 0);
        if (availableStock < normalizedQuantity) {
            res.status(400).json({
                error: `Sản phẩm không đủ tồn kho. Hiện còn ${availableStock}, yêu cầu ${normalizedQuantity}`
            });
            return;
        }
        const totalAmount = normalizedProductPrice * normalizedQuantity + normalizedShippingFee;
        const supportShippingFeeColumn = yield ensureOrdersShippingFeeColumn();
        const supportAwaitingPaymentStatus = yield ensureOrdersStatusSupportsAwaitingPayment();
        const onlineInitialStatus = supportAwaitingPaymentStatus ? 'awaiting_payment' : 'pending';
        /*-----------------------------------------
        THANH TOÁN MOMO
        -------------------------------------------*/
        if (normalizedPaymentMethod === "momo") {
            const partnerCode = "MOMO";
            const accessKey = "F8BBA842ECF85";
            const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
            const orderId = (0, crypto_2.randomUUID)();
            const requestId = orderId;
            const amount = totalAmount.toString();
            const isValidReturnUrl = typeof returnUrl === "string" &&
                /^https?:\/\//i.test(returnUrl);
            const redirectUrl = isValidReturnUrl
                ? returnUrl
                : `${process.env.FRONTEND_URL || "http://localhost:5173"}/orders`;
            const ipnUrl = "http://localhost:5000/api/orders/momo-ipn";
            const rawSignature = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + productTitle +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + redirectUrl +
                "&requestId=" + requestId +
                "&requestType=captureWallet";
            const signature = crypto_1.default
                .createHmac("sha256", secretKey)
                .update(rawSignature)
                .digest("hex");
            // Lưu đơn trước khi gọi MoMo
            if (supportShippingFeeColumn) {
                yield database_1.default.query(`INSERT INTO orders 
                    (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'momo')`, [
                    orderId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    normalizedShippingFee,
                    onlineInitialStatus
                ]);
            }
            else {
                yield database_1.default.query(`INSERT INTO orders 
                    (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'momo')`, [
                    orderId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    onlineInitialStatus
                ]);
            }
            yield notifyAdminsNewOrder(email, productTitle, normalizedQuantity, 'momo');
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
                const response = yield axios_1.default.post("https://test-payment.momo.vn/v2/gateway/api/create", momoPayload, { timeout: 10000 });
                const payUrl = (_c = response.data) === null || _c === void 0 ? void 0 : _c.payUrl;
                if (!payUrl) {
                    res.status(502).json({
                        error: "MoMo không trả về link thanh toán",
                        momoResultCode: (_d = response.data) === null || _d === void 0 ? void 0 : _d.resultCode,
                        momoMessage: (_e = response.data) === null || _e === void 0 ? void 0 : _e.message,
                        subErrors: ((_f = response.data) === null || _f === void 0 ? void 0 : _f.subErrors) || []
                    });
                    return;
                }
                res.json({
                    paymentMethod: "momo",
                    payUrl,
                    momoResultCode: (_g = response.data) === null || _g === void 0 ? void 0 : _g.resultCode,
                    momoMessage: (_h = response.data) === null || _h === void 0 ? void 0 : _h.message
                });
            }
            catch (momoError) {
                console.error("Lỗi gọi MoMo API:", {
                    status: (_j = momoError.response) === null || _j === void 0 ? void 0 : _j.status,
                    resultCode: (_l = (_k = momoError.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.resultCode,
                    message: (_o = (_m = momoError.response) === null || _m === void 0 ? void 0 : _m.data) === null || _o === void 0 ? void 0 : _o.message,
                    subErrors: (_q = (_p = momoError.response) === null || _p === void 0 ? void 0 : _p.data) === null || _q === void 0 ? void 0 : _q.subErrors,
                    fullResponse: (_r = momoError.response) === null || _r === void 0 ? void 0 : _r.data
                });
                res.status(502).json({
                    error: "Lỗi gọi MoMo API",
                    momoResultCode: (_t = (_s = momoError.response) === null || _s === void 0 ? void 0 : _s.data) === null || _t === void 0 ? void 0 : _t.resultCode,
                    momoMessage: (_v = (_u = momoError.response) === null || _u === void 0 ? void 0 : _u.data) === null || _v === void 0 ? void 0 : _v.message,
                    subErrors: ((_x = (_w = momoError.response) === null || _w === void 0 ? void 0 : _w.data) === null || _x === void 0 ? void 0 : _x.subErrors) || []
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
            const orderId = (0, crypto_2.randomUUID)();
            const amount = Math.round(totalAmount * 100);
            const clientIp = (req.headers['x-forwarded-for'] ||
                req.socket.remoteAddress ||
                req.ip ||
                '127.0.0.1')
                .toString()
                .split(',')[0]
                .trim();
            const clientReturnUrl = resolveClientReturnUrl(returnUrl);
            const vnpReturnUrl = `${backendUrl}/api/orders/vnpay-return?clientReturnUrl=${encodeURIComponent(clientReturnUrl)}`;
            if (supportShippingFeeColumn) {
                yield database_1.default.query(`INSERT INTO orders
                    (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'vnpay')`, [
                    orderId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    normalizedShippingFee,
                    onlineInitialStatus
                ]);
            }
            else {
                yield database_1.default.query(`INSERT INTO orders
                    (id, full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'vnpay')`, [
                    orderId,
                    fullName,
                    email,
                    phone,
                    address,
                    productId,
                    productTitle,
                    normalizedProductPrice,
                    normalizedQuantity,
                    onlineInitialStatus
                ]);
            }
            yield notifyAdminsNewOrder(email, productTitle, normalizedQuantity, 'vnpay');
            const params = {
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
            const secureHash = crypto_1.default
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
            yield database_1.default.query(`INSERT INTO orders 
                (full_name, email, phone, address, product_id, product_title, product_price, quantity, shipping_fee, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','cod')`, [
                fullName,
                email,
                phone,
                address,
                productId,
                productTitle,
                normalizedProductPrice,
                normalizedQuantity,
                normalizedShippingFee
            ]);
        }
        else {
            yield database_1.default.query(`INSERT INTO orders 
                (full_name, email, phone, address, product_id, product_title, product_price, quantity, status, payment_method)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','cod')`, [
                fullName,
                email,
                phone,
                address,
                productId,
                productTitle,
                normalizedProductPrice,
                normalizedQuantity
            ]);
        }
        yield notifyAdminsNewOrder(email, productTitle, normalizedQuantity, 'cod');
        res.json({
            message: "Đặt hàng thành công (COD)",
            paymentMethod: "cod"
        });
        return;
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
        return;
    }
});
exports.createOrder = createOrder;
/*-----------------------------------------
MoMo IPN (callback từ MoMo)
-------------------------------------------*/
const momoIPN = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default.connect();
    try {
        const { orderId, resultCode } = req.body;
        if (resultCode === 0) {
            yield client.query('BEGIN');
            const orderResult = yield client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
            if (orderResult.rows.length > 0) {
                const order = orderResult.rows[0];
                if (!order.inventory_deducted) {
                    yield (0, warehouse_service_1.applyInventoryChange)(client, {
                        productId: Number(order.product_id),
                        quantityDelta: -Number(order.quantity || 1),
                        changeType: 'sale',
                        reason: 'Trừ kho từ MoMo IPN',
                        referenceType: 'order',
                        referenceId: String(order.id),
                        actorUserId: null
                    });
                    yield client.query(`UPDATE orders
                         SET inventory_deducted = TRUE
                         WHERE id = $1`, [orderId]);
                }
                // Giữ trạng thái pending để admin xác nhận thủ công sau khi đã thanh toán.
                yield client.query(`UPDATE orders SET status = 'pending' WHERE id = $1`, [orderId]);
            }
            yield client.query('COMMIT');
        }
        else {
            yield client.query(`UPDATE orders
                 SET status = CASE WHEN status = 'awaiting_payment' THEN 'cancelled' ELSE status END
                 WHERE id = $1`, [orderId]);
        }
        res.json({ message: "OK" });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error("Lỗi xử lý MoMo IPN:", error);
        res.status(500).json({ error: "IPN error" });
    }
    finally {
        client.release();
    }
});
exports.momoIPN = momoIPN;
/*-----------------------------------------
VNPay Return URL (callback browser redirect)
-------------------------------------------*/
const vnpayReturn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default.connect();
    try {
        const vnpHashSecret = process.env.VNP_HASH_SECRET || "E60GR73NEC2MI25E48TF7M0QNI6CVGVR";
        const secureHash = String(req.query.vnp_SecureHash || '');
        const clientReturnUrl = resolveClientReturnUrl(typeof req.query.clientReturnUrl === 'string' ? req.query.clientReturnUrl : undefined);
        const vnpParams = {};
        Object.entries(req.query).forEach(([key, value]) => {
            var _a;
            if (!key.startsWith('vnp_'))
                return;
            if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType')
                return;
            const normalizedValue = Array.isArray(value) ? String((_a = value[0]) !== null && _a !== void 0 ? _a : '') : String(value !== null && value !== void 0 ? value : '');
            vnpParams[key] = normalizedValue;
        });
        const signData = buildVNPaySignData(vnpParams);
        const expectedHash = crypto_1.default
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
        yield client.query('BEGIN');
        const orderResult = yield client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
        if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];
            if (isSuccess) {
                if (!order.inventory_deducted) {
                    yield (0, warehouse_service_1.applyInventoryChange)(client, {
                        productId: Number(order.product_id),
                        quantityDelta: -Number(order.quantity || 1),
                        changeType: 'sale',
                        reason: 'Trừ kho từ VNPay callback',
                        referenceType: 'order',
                        referenceId: String(order.id),
                        actorUserId: null
                    });
                    yield client.query(`UPDATE orders
                         SET inventory_deducted = TRUE
                         WHERE id = $1`, [orderId]);
                }
                // Giữ trạng thái pending để admin xác nhận thủ công sau khi đã thanh toán.
                yield client.query(`UPDATE orders SET status = 'pending' WHERE id = $1`, [orderId]);
            }
            else {
                yield client.query(`UPDATE orders
                     SET status = CASE WHEN status = 'awaiting_payment' THEN 'cancelled' ELSE status END
                     WHERE id = $1`, [orderId]);
            }
        }
        yield client.query('COMMIT');
        const redirectUrl = buildRedirectUrl(clientReturnUrl, {
            payment: 'vnpay',
            status: isSuccess ? 'success' : 'failed',
            orderId,
            code: responseCode || 'unknown'
        });
        res.redirect(redirectUrl);
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Lỗi xử lý VNPay return:', error);
        const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;
        const redirectUrl = buildRedirectUrl(fallbackUrl, {
            payment: 'vnpay',
            status: 'failed',
            reason: 'server-error'
        });
        res.redirect(redirectUrl);
    }
    finally {
        client.release();
    }
});
exports.vnpayReturn = vnpayReturn;
/*-----------------------------------------
    Get all orders
-------------------------------------------*/
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT *
             FROM orders
             WHERE status <> 'awaiting_payment'
             ORDER BY created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error("Lỗi khi lấy danh sách đơn hàng:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});
exports.getAllOrders = getAllOrders;
/*-----------------------------------------
  Admin revenue summary
-------------------------------------------*/
const getRevenueSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const from = typeof req.query.from === "string" ? req.query.from : undefined;
        const to = typeof req.query.to === "string" ? req.query.to : undefined;
        const dateConditions = [];
        const values = [];
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
        const [summaryResult, byDateResult, orderStatsResult] = yield Promise.all([
            database_1.default.query(summaryQuery, values),
            database_1.default.query(byDateQuery, values),
            database_1.default.query(orderStatsQuery, values)
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
    }
    catch (error) {
        console.error("Lỗi khi lấy tổng quan doanh thu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});
exports.getRevenueSummary = getRevenueSummary;
/*-----------------------------------------
  Update order status
-------------------------------------------*/
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default.connect();
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: "Trạng thái không hợp lệ" });
            return;
        }
        yield client.query('BEGIN');
        const orderResult = yield client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [id]);
        if (orderResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: "Không tìm thấy đơn hàng" });
            return;
        }
        const order = orderResult.rows[0];
        const currentStatus = String(order.status || 'pending');
        if (currentStatus === status) {
            yield client.query('ROLLBACK');
            res.json({ message: 'Trạng thái không thay đổi', order });
            return;
        }
        const shouldDeductStock = STOCK_DEDUCT_STATUSES.has(status) && !Boolean(order.inventory_deducted);
        const shouldRestoreStock = status === 'cancelled' && Boolean(order.inventory_deducted);
        if (shouldDeductStock) {
            yield (0, warehouse_service_1.applyInventoryChange)(client, {
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
            yield (0, warehouse_service_1.applyInventoryChange)(client, {
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
            yield client.query(`UPDATE products 
                 SET sold = sold + $1 
                 WHERE id = $2`, [order.quantity, order.product_id]);
        }
        yield client.query(`UPDATE orders
             SET status = $1,
                 inventory_deducted = CASE
                    WHEN $2 THEN FALSE
                    WHEN $3 THEN TRUE
                    ELSE inventory_deducted
                 END
             WHERE id = $4`, [status, status === 'cancelled', shouldDeductStock, id]);
        yield client.query(`INSERT INTO notifications (user_email, title, message, is_read)
             VALUES ($1, $2, $3, FALSE)`, [
            order.email,
            `Cập nhật đơn hàng: ${order.product_title}`,
            `Đơn hàng của bạn đã được cập nhật sang trạng thái: ${status}`
        ]);
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công",
            order: Object.assign(Object.assign({}, order), { status, inventory_deducted: status === 'cancelled' ? false : (shouldDeductStock ? true : Boolean(order.inventory_deducted)) })
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : "Lỗi server" });
    }
    finally {
        client.release();
    }
});
exports.updateOrderStatus = updateOrderStatus;
/*-----------------------------------------
  User cancel own pending order
-------------------------------------------*/
const cancelUserOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
            return;
        }
        const userResult = yield database_1.default.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        const userEmail = (_b = userResult.rows[0]) === null || _b === void 0 ? void 0 : _b.email;
        if (!userEmail) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        const orderResult = yield database_1.default.query(`SELECT * FROM orders WHERE id = $1`, [id]);
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
        yield database_1.default.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1`, [id]);
        yield database_1.default.query(`INSERT INTO notifications (user_email, title, message, is_read)
             VALUES ($1, $2, $3, FALSE)`, [
            order.email,
            `Đơn hàng ${order.product_title}`,
            'Bạn đã hủy đơn hàng thành công.'
        ]);
        res.json({ message: 'Hủy đơn hàng thành công' });
    }
    catch (error) {
        console.error('Lỗi khi user hủy đơn:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.cancelUserOrder = cancelUserOrder;
/*-----------------------------------------
  User delete own completed/cancelled order
-------------------------------------------*/
const deleteUserOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
            return;
        }
        const userResult = yield database_1.default.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        const userEmail = (_b = userResult.rows[0]) === null || _b === void 0 ? void 0 : _b.email;
        if (!userEmail) {
            res.status(404).json({ error: 'Không tìm thấy người dùng' });
            return;
        }
        const orderResult = yield database_1.default.query(`SELECT * FROM orders WHERE id = $1`, [id]);
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
        yield database_1.default.query(`DELETE FROM orders WHERE id = $1`, [id]);
        res.json({ message: 'Xóa đơn hàng thành công' });
    }
    catch (error) {
        console.error('Lỗi khi user xóa đơn:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});
exports.deleteUserOrder = deleteUserOrder;
/*-----------------------------------------
  Get user orders
-------------------------------------------*/
const getUserOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.params;
        const result = yield database_1.default.query(`SELECT o.*, p.image AS product_image
             FROM orders o
             LEFT JOIN products p ON p.id = o.product_id
             WHERE o.email = $1 AND o.status <> 'awaiting_payment'
             ORDER BY o.created_at DESC`, [email]);
        res.json(result.rows);
    }
    catch (error) {
        console.error("Lỗi khi lấy đơn hàng user:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});
exports.getUserOrders = getUserOrders;

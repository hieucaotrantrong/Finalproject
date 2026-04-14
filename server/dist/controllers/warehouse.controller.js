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
exports.adjustInventory = exports.exportInventory = exports.importInventory = exports.getInventoryTransactions = exports.getInventorySummary = void 0;
const database_1 = __importDefault(require("../config/database"));
const warehouse_service_1 = require("../services/warehouse.service");
const getActorId = (req) => {
    var _a;
    const parsed = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId);
    return Number.isFinite(parsed) ? parsed : null;
};
const getInventorySummary = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT
                p.id AS product_id,
                p.title,
                p.category,
                p.image,
                p.price,
                p.is_out_of_stock,
                COALESCE(inv.quantity, 0)::int AS stock_quantity,
                COALESCE(p.sold, 0)::int AS sold
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             ORDER BY p.id DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Lỗi khi lấy tồn kho:', error);
        res.status(500).json({ error: 'Lỗi khi lấy tồn kho' });
    }
});
exports.getInventorySummary = getInventorySummary;
const getInventoryTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.query;
        const values = [];
        const where = [];
        if (productId) {
            values.push(Number(productId));
            where.push(`it.product_id = $${values.length}`);
        }
        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const result = yield database_1.default.query(`SELECT
                it.id,
                it.product_id,
                p.title AS product_title,
                it.change_type,
                it.quantity_change,
                it.quantity_after,
                it.reason,
                it.reference_type,
                it.reference_id,
                it.created_at,
                u.email AS created_by_email
             FROM inventory_transactions it
             LEFT JOIN products p ON p.id = it.product_id
             LEFT JOIN users u ON u.id = it.created_by
             ${whereClause}
             ORDER BY it.created_at DESC
             LIMIT 300`, values);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        res.status(500).json({ error: 'Lỗi khi lấy lịch sử kho' });
    }
});
exports.getInventoryTransactions = getInventoryTransactions;
const importInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, quantity, reason } = req.body;
    const normalizedProductId = Number(productId);
    const normalizedQuantity = Number(quantity);
    if (!Number.isFinite(normalizedProductId) || normalizedProductId <= 0) {
        res.status(400).json({ error: 'productId không hợp lệ' });
        return;
    }
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        res.status(400).json({ error: 'quantity phải lớn hơn 0' });
        return;
    }
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        const productResult = yield client.query('SELECT id, title FROM products WHERE id = $1 LIMIT 1', [normalizedProductId]);
        if (productResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const quantityAfter = yield (0, warehouse_service_1.applyInventoryChange)(client, {
            productId: normalizedProductId,
            quantityDelta: normalizedQuantity,
            changeType: 'import',
            reason: reason || 'Nhập kho',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: 'Nhập kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Lỗi nhập kho:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Lỗi nhập kho' });
    }
    finally {
        client.release();
    }
});
exports.importInventory = importInventory;
const exportInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, quantity, reason } = req.body;
    const normalizedProductId = Number(productId);
    const normalizedQuantity = Number(quantity);
    if (!Number.isFinite(normalizedProductId) || normalizedProductId <= 0) {
        res.status(400).json({ error: 'productId không hợp lệ' });
        return;
    }
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        res.status(400).json({ error: 'quantity phải lớn hơn 0' });
        return;
    }
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        const productResult = yield client.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [normalizedProductId]);
        if (productResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        const quantityAfter = yield (0, warehouse_service_1.applyInventoryChange)(client, {
            productId: normalizedProductId,
            quantityDelta: -normalizedQuantity,
            changeType: 'export',
            reason: reason || 'Xuất kho thủ công',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: 'Xuất kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Lỗi xuất kho:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Lỗi xuất kho' });
    }
    finally {
        client.release();
    }
});
exports.exportInventory = exportInventory;
const adjustInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, quantityDelta, reason } = req.body;
    const normalizedProductId = Number(productId);
    const normalizedDelta = Number(quantityDelta);
    if (!Number.isFinite(normalizedProductId) || normalizedProductId <= 0) {
        res.status(400).json({ error: 'productId không hợp lệ' });
        return;
    }
    if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
        res.status(400).json({ error: 'quantityDelta phải khác 0' });
        return;
    }
    const client = yield database_1.default.connect();
    try {
        yield client.query('BEGIN');
        const productResult = yield client.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [normalizedProductId]);
        if (productResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }
        yield (0, warehouse_service_1.ensureInventoryRow)(client, normalizedProductId);
        const quantityAfter = yield (0, warehouse_service_1.applyInventoryChange)(client, {
            productId: normalizedProductId,
            quantityDelta: normalizedDelta,
            changeType: 'adjust',
            reason: reason || 'Điều chỉnh kho',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: 'Điều chỉnh kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Lỗi điều chỉnh kho:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Lỗi điều chỉnh kho' });
    }
    finally {
        client.release();
    }
});
exports.adjustInventory = adjustInventory;

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyInventoryChange = exports.syncProductOutOfStock = exports.ensureInventoryRow = void 0;
const normalizeActorId = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};
const ensureInventoryRow = (client, productId) => __awaiter(void 0, void 0, void 0, function* () {
    yield client.query(`INSERT INTO product_inventory (product_id, quantity)
         VALUES ($1, 0)
         ON CONFLICT (product_id) DO NOTHING`, [productId]);
});
exports.ensureInventoryRow = ensureInventoryRow;
const syncProductOutOfStock = (client, productId) => __awaiter(void 0, void 0, void 0, function* () {
    yield client.query(`UPDATE products p
         SET is_out_of_stock = COALESCE(inv.quantity, 0) <= 0
         FROM product_inventory inv
         WHERE p.id = $1 AND inv.product_id = p.id`, [productId]);
});
exports.syncProductOutOfStock = syncProductOutOfStock;
const applyInventoryChange = (client, input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { productId, quantityDelta, changeType, reason = null, referenceType = null, referenceId = null, actorUserId = null, allowNegative = false } = input;
    if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('productId không hợp lệ');
    }
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
        throw new Error('quantityDelta phải khác 0');
    }
    yield (0, exports.ensureInventoryRow)(client, productId);
    const rowResult = yield client.query(`SELECT quantity
         FROM product_inventory
         WHERE product_id = $1
         FOR UPDATE`, [productId]);
    const currentQuantity = Number(((_a = rowResult.rows[0]) === null || _a === void 0 ? void 0 : _a.quantity) || 0);
    const nextQuantity = currentQuantity + Number(quantityDelta);
    if (!allowNegative && nextQuantity < 0) {
        throw new Error('Tồn kho không đủ để xuất');
    }
    yield client.query(`UPDATE product_inventory
         SET quantity = $1,
             updated_at = NOW()
         WHERE product_id = $2`, [nextQuantity, productId]);
    yield client.query(`INSERT INTO inventory_transactions (
            product_id,
            change_type,
            quantity_change,
            quantity_after,
            reason,
            reference_type,
            reference_id,
            created_by
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        productId,
        changeType,
        quantityDelta,
        nextQuantity,
        reason,
        referenceType,
        referenceId,
        normalizeActorId(actorUserId)
    ]);
    yield (0, exports.syncProductOutOfStock)(client, productId);
    return nextQuantity;
});
exports.applyInventoryChange = applyInventoryChange;

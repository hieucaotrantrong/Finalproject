import { PoolClient } from 'pg';

export type InventoryChangeType = 'import' | 'export' | 'adjust' | 'sale' | 'cancel_restore';

interface ApplyInventoryChangeInput {
    productId: number;
    quantityDelta: number;
    changeType: InventoryChangeType;
    reason?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    actorUserId?: number | null;
    allowNegative?: boolean;
}

const normalizeActorId = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

export const ensureInventoryRow = async (client: PoolClient, productId: number): Promise<void> => {
    await client.query(
        `INSERT INTO product_inventory (product_id, quantity)
         VALUES ($1, 0)
         ON CONFLICT (product_id) DO NOTHING`,
        [productId]
    );
};

export const syncProductOutOfStock = async (client: PoolClient, productId: number): Promise<void> => {
    await client.query(
        `UPDATE products p
         SET is_out_of_stock = COALESCE(inv.quantity, 0) <= 0
         FROM product_inventory inv
         WHERE p.id = $1 AND inv.product_id = p.id`,
        [productId]
    );
};

export const applyInventoryChange = async (
    client: PoolClient,
    input: ApplyInventoryChangeInput
): Promise<number> => {
    const {
        productId,
        quantityDelta,
        changeType,
        reason = null,
        referenceType = null,
        referenceId = null,
        actorUserId = null,
        allowNegative = false
    } = input;

    if (!Number.isFinite(productId) || productId <= 0) {
        throw new Error('productId không hợp lệ');
    }

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
        throw new Error('quantityDelta phải khác 0');
    }

    await ensureInventoryRow(client, productId);

    const rowResult = await client.query(
        `SELECT quantity
         FROM product_inventory
         WHERE product_id = $1
         FOR UPDATE`,
        [productId]
    );

    const currentQuantity = Number(rowResult.rows[0]?.quantity || 0);
    const nextQuantity = currentQuantity + Number(quantityDelta);

    if (!allowNegative && nextQuantity < 0) {
        throw new Error('Tồn kho không đủ để xuất');
    }

    await client.query(
        `UPDATE product_inventory
         SET quantity = $1,
             updated_at = NOW()
         WHERE product_id = $2`,
        [nextQuantity, productId]
    );

    await client.query(
        `INSERT INTO inventory_transactions (
            product_id,
            change_type,
            quantity_change,
            quantity_after,
            reason,
            reference_type,
            reference_id,
            created_by
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            productId,
            changeType,
            quantityDelta,
            nextQuantity,
            reason,
            referenceType,
            referenceId,
            normalizeActorId(actorUserId)
        ]
    );

    await syncProductOutOfStock(client, productId);

    return nextQuantity;
};

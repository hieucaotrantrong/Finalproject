import { Request, Response } from 'express';
import pool from '../config/database';
import { applyInventoryChange, ensureInventoryRow } from '../services/warehouse.service';

const getActorId = (req: Request): number | null => {
    const parsed = Number(req.user?.userId);
    return Number.isFinite(parsed) ? parsed : null;
};

export const getInventorySummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT
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
             ORDER BY p.id DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Lỗi khi lấy tồn kho:', error);
        res.status(500).json({ error: 'Lỗi khi lấy tồn kho' });
    }
};

export const getInventoryTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId } = req.query;
        const values: any[] = [];
        const where: string[] = [];

        if (productId) {
            values.push(Number(productId));
            where.push(`it.product_id = $${values.length}`);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT
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
             LIMIT 300`,
            values
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử kho:', error);
        res.status(500).json({ error: 'Lỗi khi lấy lịch sử kho' });
    }
};

export const getMonthlyInventoryReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const monthParam = typeof req.query.month === 'string' ? req.query.month.trim() : '';
        const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

        let year: number;
        let month: number;

        if (monthParam && monthPattern.test(monthParam)) {
            const [y, m] = monthParam.split('-').map(Number);
            year = y;
            month = m;
        } else {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1;
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 1));

        const reportResult = await pool.query(
            `SELECT
                p.id AS product_id,
                p.title,
                COALESCE(SUM(CASE WHEN it.change_type = 'import' THEN it.quantity_change ELSE 0 END), 0)::int AS imported_quantity,
                COALESCE(SUM(CASE WHEN it.change_type = 'sale' THEN ABS(it.quantity_change) ELSE 0 END), 0)::int AS sold_quantity,
                COALESCE(SUM(CASE WHEN it.change_type = 'export' THEN ABS(it.quantity_change) ELSE 0 END), 0)::int AS exported_quantity,
                (
                    COALESCE(inv.quantity, 0)
                    - COALESCE((
                        SELECT SUM(it_after.quantity_change)
                        FROM inventory_transactions it_after
                        WHERE it_after.product_id = p.id
                          AND it_after.created_at >= $2
                    ), 0)
                )::int AS month_ending_stock
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             LEFT JOIN inventory_transactions it
                ON it.product_id = p.id
               AND it.created_at >= $1
               AND it.created_at < $2
             GROUP BY p.id, p.title, inv.quantity
             ORDER BY p.id DESC`,
            [startDate.toISOString(), endDate.toISOString()]
        );

        const byProduct = reportResult.rows.map((row) => ({
            product_id: Number(row.product_id || 0),
            title: row.title,
            imported_quantity: Number(row.imported_quantity || 0),
            sold_quantity: Number(row.sold_quantity || 0),
            exported_quantity: Number(row.exported_quantity || 0),
            month_ending_stock: Number(row.month_ending_stock || 0)
        }));

        const summary = byProduct.reduce(
            (acc, item) => {
                acc.totalImported += item.imported_quantity;
                acc.totalSold += item.sold_quantity;
                acc.totalManualExport += item.exported_quantity;
                acc.totalEndingStock += item.month_ending_stock;

                if (item.imported_quantity > 0 || item.sold_quantity > 0 || item.exported_quantity > 0) {
                    acc.productsWithMovement += 1;
                }

                return acc;
            },
            {
                totalImported: 0,
                totalSold: 0,
                totalManualExport: 0,
                totalEndingStock: 0,
                productsWithMovement: 0
            }
        );

        const monthText = `${year}-${String(month).padStart(2, '0')}`;

        res.json({
            month: monthText,
            period: {
                from: startDate.toISOString(),
                to: endDate.toISOString()
            },
            summary,
            byProduct
        });
    } catch (error) {
        console.error('Lỗi khi lấy báo cáo kho theo tháng:', error);
        res.status(500).json({ error: 'Lỗi khi lấy báo cáo kho theo tháng' });
    }
};

export const importInventory = async (req: Request, res: Response): Promise<void> => {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const productResult = await client.query(
            'SELECT id, title FROM products WHERE id = $1 LIMIT 1',
            [normalizedProductId]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const quantityAfter = await applyInventoryChange(client, {
            productId: normalizedProductId,
            quantityDelta: normalizedQuantity,
            changeType: 'import',
            reason: reason || 'Nhập kho',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Nhập kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi nhập kho:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Lỗi nhập kho' });
    } finally {
        client.release();
    }
};

export const exportInventory = async (req: Request, res: Response): Promise<void> => {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const productResult = await client.query(
            'SELECT id FROM products WHERE id = $1 LIMIT 1',
            [normalizedProductId]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const quantityAfter = await applyInventoryChange(client, {
            productId: normalizedProductId,
            quantityDelta: -normalizedQuantity,
            changeType: 'export',
            reason: reason || 'Xuất kho thủ công',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Xuất kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi xuất kho:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Lỗi xuất kho' });
    } finally {
        client.release();
    }
};

export const adjustInventory = async (req: Request, res: Response): Promise<void> => {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const productResult = await client.query(
            'SELECT id FROM products WHERE id = $1 LIMIT 1',
            [normalizedProductId]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        await ensureInventoryRow(client, normalizedProductId);

        const quantityAfter = await applyInventoryChange(client, {
            productId: normalizedProductId,
            quantityDelta: normalizedDelta,
            changeType: 'adjust',
            reason: reason || 'Điều chỉnh kho',
            referenceType: 'manual',
            actorUserId: getActorId(req)
        });

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Điều chỉnh kho thành công',
            productId: normalizedProductId,
            quantityAfter
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Lỗi điều chỉnh kho:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Lỗi điều chỉnh kho' });
    } finally {
        client.release();
    }
};

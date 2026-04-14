import { Request, Response } from 'express';
import pool from '../config/database';
import { ensureInventoryRow } from '../services/warehouse.service';

const toProductResponse = (product: any) => ({
    ...product,
    is_out_of_stock: Boolean(product?.is_out_of_stock),
    stock_quantity: Number(product?.stock_quantity || 0)
});

/*----------------------------------
Get all products
-----------------------------------*/
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT
                p.*,
                COALESCE(inv.quantity, 0)::int AS stock_quantity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
            FROM products p
            LEFT JOIN product_inventory inv ON inv.product_id = p.id
            LEFT JOIN (
                SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                FROM reviews
                GROUP BY product_id
            ) r ON r.product_id = p.id
        `);
        res.json((result.rows || []).map(toProductResponse));
    } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
};

/*----------------------------------
Get product by id (FULL: product + images + specs)
-----------------------------------*/
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        // 1. product
        const result = await pool.query(
            `SELECT
                p.*,
                COALESCE(inv.quantity, 0)::int AS stock_quantity,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
             FROM products p
             LEFT JOIN product_inventory inv ON inv.product_id = p.id
             LEFT JOIN (
                SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                FROM reviews
                GROUP BY product_id
             ) r ON r.product_id = p.id
             WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const product = toProductResponse(result.rows[0]);

        // 2. images
        const imageResult = await pool.query(
            'SELECT image_url FROM product_images WHERE product_id = $1',
            [id]
        );

        product.images = imageResult.rows.map((img: any) => img.image_url);

        // 🔥 3. specs
        const specResult = await pool.query(
            'SELECT group_name, spec_key, spec_value FROM product_specs WHERE product_id = $1',
            [id]
        );

        product.specs = specResult.rows;

        res.json(product);

    } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
};

/*----------------------------------
Create product (FULL: product + images + specs)
-----------------------------------*/
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    const {
        title,
        originalprice,
        price,
        discount,
        tag,
        image,
        category,
        images,
        specs,
        is_out_of_stock
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. insert product
        const result = await client.query(
            `INSERT INTO products (title, originalprice, price, discount, tag, image, category, is_out_of_stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [title, originalprice, price, discount, tag, image, category, Boolean(is_out_of_stock)]
        );

        const newProduct = result.rows[0];

        // Ensure each product always has an inventory row, default quantity = 0.
        await ensureInventoryRow(client, Number(newProduct.id));
        newProduct.stock_quantity = 0;

        // 2. insert images
        if (Array.isArray(images)) {
            for (const img of images) {
                if (!img) continue;
                await client.query(
                    `INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`,
                    [newProduct.id, img]
                );
            }
        }

        // 🔥 3. insert specs
        if (Array.isArray(specs)) {
            for (const spec of specs) {
                if (!spec.spec_key || !spec.spec_value) continue;

                await client.query(
                    `INSERT INTO product_specs (product_id, group_name, spec_key, spec_value)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        newProduct.id,
                        spec.group_name,
                        spec.spec_key,
                        spec.spec_value
                    ]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json(toProductResponse(newProduct));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi khi thêm sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
    } finally {
        client.release();
    }
};

/*----------------------------------
Update product (FULL: product + images + specs)
-----------------------------------*/
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const {
        title,
        originalprice,
        price,
        discount,
        tag,
        image,
        category,
        images,
        specs,
        is_out_of_stock
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const currentProduct = await client.query(
            'SELECT is_out_of_stock FROM products WHERE id = $1 LIMIT 1',
            [id]
        );

        if (currentProduct.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const nextOutOfStock =
            typeof is_out_of_stock === 'boolean'
                ? is_out_of_stock
                : Boolean(currentProduct.rows[0]?.is_out_of_stock);

        // 1. update product
        const result = await client.query(
            `UPDATE products 
             SET title = $1,
                 "originalprice" = $2,
                 price = $3,
                 discount = $4,
                 tag = $5,
                 image = $6,
                 category = $7,
                 is_out_of_stock = $8
             WHERE id = $9`,
            [title, originalprice, price, discount, tag, image, category, nextOutOfStock, id]
        );

        if ((result.rowCount ?? 0) === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        // 2. update images
        if (Array.isArray(images)) {
            await client.query(
                'DELETE FROM product_images WHERE product_id = $1',
                [id]
            );

            for (const img of images) {
                if (!img) continue;
                await client.query(
                    `INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`,
                    [id, img]
                );
            }
        }

        // 🔥 3. update specs
        if (Array.isArray(specs)) {
            await client.query(
                'DELETE FROM product_specs WHERE product_id = $1',
                [id]
            );

            for (const spec of specs) {
                if (!spec.spec_key || !spec.spec_value) continue;

                await client.query(
                    `INSERT INTO product_specs (product_id, group_name, spec_key, spec_value)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        id,
                        spec.group_name,
                        spec.spec_key,
                        spec.spec_value
                    ]
                );
            }
        }

        await client.query('COMMIT');

        res.json({ message: 'Cập nhật sản phẩm thành công' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Lỗi khi cập nhật sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
    } finally {
        client.release();
    }
};

/*----------------------------------
Delete product
-----------------------------------*/
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1',
            [id]
        );

        if ((result.rowCount ?? 0) > 0) {
            res.json({ message: 'Xóa sản phẩm thành công' });
        } else {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
    } catch (err) {
        console.error('Lỗi khi xóa sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
    }
};

/*----------------------------------
Update stock status (in/out of stock)
-----------------------------------*/
export const updateProductStockStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { is_out_of_stock } = req.body;

    if (typeof is_out_of_stock !== 'boolean') {
        res.status(400).json({ error: 'is_out_of_stock phải là boolean' });
        return;
    }

    try {
        const existing = await pool.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [id]);

        if (existing.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const updated = await pool.query(
            `UPDATE products
             SET is_out_of_stock = $1
             WHERE id = $2
             RETURNING *`,
            [is_out_of_stock, id]
        );

        res.json({
            message: 'Cập nhật trạng thái hàng thành công',
            product: toProductResponse(updated.rows[0])
        });
    } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái hàng:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái hàng' });
    }
};
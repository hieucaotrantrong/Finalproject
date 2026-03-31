import { Request, Response } from 'express';
import pool from '../config/database';

/*----------------------------------
Get all products
-----------------------------------*/
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT
                p.*,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
            FROM products p
            LEFT JOIN (
                SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                FROM reviews
                GROUP BY product_id
            ) r ON r.product_id = p.id
        `);
        res.json(result.rows);
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
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS review_count
             FROM products p
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

        const product = result.rows[0];

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
        specs
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. insert product
        const result = await client.query(
            `INSERT INTO products (title, originalprice, price, discount, tag, image, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, originalprice, price, discount, tag, image, category]
        );

        const newProduct = result.rows[0];

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

        res.status(201).json(newProduct);

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
        specs
    } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. update product
        const result = await client.query(
            `UPDATE products 
             SET title = $1,
                 "originalprice" = $2,
                 price = $3,
                 discount = $4,
                 tag = $5,
                 image = $6,
                 category = $7
             WHERE id = $8`,
            [title, originalprice, price, discount, tag, image, category, id]
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
import { Request, Response } from 'express';
import pool from '../config/database';

/*----------------------------------
Get all products
-----------------------------------*/
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Attempting to query products...');
        const result = await pool.query('SELECT * FROM products');
        console.log('Query successful, rows:', result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        // Trả về thông tin lỗi chi tiết hơn trong development
        res.status(500).json({
            error: 'Lỗi khi lấy sản phẩm',
            details: process.env.NODE_ENV !== 'production' ? err : undefined
        });
    }
};

/*----------------------------------
Get product by id
-----------------------------------*/
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        // 1. lấy product
        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
            return;
        }

        const product = result.rows[0];

        // 2. lấy danh sách ảnh
        const imageResult = await pool.query(
            'SELECT image_url FROM product_images WHERE product_id = $1',
            [id]
        );

        // 3. gộp images vào product
        product.images = imageResult.rows.map((img: any) => img.image_url);

        // 4. trả về
        res.json(product);

    } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
};

/*----------------------------------
Create product
-----------------------------------*/
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    const { title, originalprice, price, discount, tag, image, category, images } = req.body;

    console.log('Received data:', req.body);

    try {
        // 1. thêm product
        const result = await pool.query(
            `INSERT INTO products (title, originalprice, price, discount, tag, image, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, originalprice, price, discount, tag, image, category]
        );

        const newProduct = result.rows[0];

        // 2. thêm nhiều ảnh vào bảng product_images
        if (images && images.length > 0) {
            for (const img of images) {
                await pool.query(
                    `INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`,
                    [newProduct.id, img]
                );
            }
        }

        res.status(201).json(newProduct);

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi thêm sản phẩm' });
    }
};

/*----------------------------------
Update product
-----------------------------------*/
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, originalprice, price, discount, tag, image, category, images } = req.body;

    console.log('Update product ID:', id);
    console.log('Update data:', req.body);

    try {
        const result = await pool.query(
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

        if (Array.isArray(images)) {
            await pool.query('DELETE FROM product_images WHERE product_id = $1', [id]);

            for (const img of images) {
                if (!img) continue;
                await pool.query(
                    `INSERT INTO product_images (product_id, image_url)
                     VALUES ($1, $2)`,
                    [id, img]
                );
            }
        }

        console.log('Update result rowCount:', result.rowCount);

        if ((result.rowCount ?? 0) > 0) {
            res.json({ message: 'Cập nhật sản phẩm thành công' });
        } else {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm' });
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
        console.error('Database error:', err);
        res.status(500).json({ error: 'Lỗi khi xóa sản phẩm' });
    }
};

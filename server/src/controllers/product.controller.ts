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
        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Sản phẩm không tồn tại' });
        }
    } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        res.status(500).json({ error: 'Lỗi khi lấy sản phẩm' });
    }
};

/*----------------------------------
Create product
-----------------------------------*/
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    const { title, originalprice, price, discount, tag, image, category } = req.body;

    console.log('Received data:', req.body);

    try {
        const result = await pool.query(
            `INSERT INTO products (title, originalprice, price, discount, tag, image, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, originalprice, price, discount, tag, image, category]
        );

        res.status(201).json(result.rows[0]);
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
    const { title, originalprice, price, discount, tag, image, category } = req.body;

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

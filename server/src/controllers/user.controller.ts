import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcryptjs';

/*----------------------------------
  Get all users
-----------------------------------*/
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, phone, address, birth_date, gender, avatar, updated_at
       FROM users
       ORDER BY updated_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Lỗi getAllUsers:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/*----------------------------------
  Get user by ID
-----------------------------------*/
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, role, phone, address, birth_date, gender, avatar, updated_at
       FROM users 
       WHERE id = $1 
       LIMIT 1`,
      [id]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Lỗi getUserById:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/*----------------------------------
  Create user
-----------------------------------*/
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, password, role, phone, address, birth_date, gender, avatar } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email và password là bắt buộc' });
      return;
    }

    // Check email exist
    const exists = await pool.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);

    if (exists.rows.length > 0) {
      res.status(409).json({ error: 'Email đã tồn tại' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role, phone, address, birth_date, gender, avatar, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [
        first_name || null,
        last_name || null,
        email,
        hashed,
        role || 'user',
        phone || null,
        address || null,
        birth_date || null,
        gender || null,
        avatar || null
      ]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Lỗi createUser:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/*----------------------------------
  Update user
-----------------------------------*/
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { first_name, last_name, role, phone, address, birth_date, gender, avatar } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1,
           last_name = $2,
           role = $3,
           phone = $4,
           address = $5,
           birth_date = $6,
           gender = $7,
           avatar = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        first_name || null,
        last_name || null,
        role || null,
        phone || null,
        address || null,
        birth_date || null,
        gender || null,
        avatar || null,
        id
      ]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
  } catch (err) {
    console.error('Lỗi updateUser:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/*----------------------------------
  Delete user
-----------------------------------*/
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
  } catch (err) {
    console.error('Lỗi deleteUser:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

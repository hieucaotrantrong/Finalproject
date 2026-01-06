import pool from '../config/database';
import { User } from '../interfaces/User';
import bcrypt from 'bcryptjs';

export default {
    /* -----------------------------------------
       Create User
    ------------------------------------------ */
    async createUser(user: User): Promise<User> {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);

        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                user.first_name,
                user.last_name,
                user.email,
                hashedPassword,
                user.role || "user"
            ]
        );

        return result.rows[0];
    },

    /* -----------------------------------------
       Find by email
    ------------------------------------------ */
    async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    },

    /* -----------------------------------------
       Find by ID
    ------------------------------------------ */
    async findById(id: number): Promise<User | null> {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    },

    /* -----------------------------------------
       Update Profile
    ------------------------------------------ */
    async updateProfile(userId: number, profileData: any): Promise<User | null> {
        const { first_name, last_name, email, phone, address, birth_date, gender, avatar } = profileData;

        // Format date for PostgreSQL (YYYY-MM-DD)
        let formattedBirthDate = birth_date ? new Date(birth_date).toISOString().split("T")[0] : null;

        await pool.query(
            `UPDATE users SET 
                first_name = $1,
                last_name = $2,
                email = $3,
                phone = $4,
                address = $5,
                birth_date = $6,
                gender = $7,
                avatar = $8
             WHERE id = $9`,
            [
                first_name,
                last_name,
                email,
                phone,
                address,
                formattedBirthDate,
                gender,
                avatar,
                userId
            ]
        );

        return this.findById(userId);
    },

    /* -----------------------------------------
       Verify Password
    ------------------------------------------ */
    async verifyPassword(userId: number, password: string): Promise<boolean> {
        const user = await this.findById(userId);
        if (!user) return false;

        return await bcrypt.compare(password, user.password);
    },

    /* -----------------------------------------
       Change Password
    ------------------------------------------ */
    async changePassword(userId: number, newPassword: string): Promise<boolean> {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const result = await pool.query(
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashedPassword, userId]
        );

        return (result.rowCount ?? 0) > 0;
    }
};

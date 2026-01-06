import bcrypt from 'bcryptjs';
import pool from './config/database';

async function createAdmin() {
    const password = "admin123";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log("Hashed password:", hash);
    console.log("\n--- SQL INSERT Statement ---");
    console.log(`INSERT INTO users (first_name, last_name, email, password, role)`);
    console.log(`VALUES ('Admin', 'System', 'admin@gmail.com', '${hash}', 'admin');`);
    
    // Tự động insert vào database
    try {
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, password, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE
             SET password = EXCLUDED.password, role = 'admin', updated_at = CURRENT_TIMESTAMP
             RETURNING id, email, role`,
            ['Admin', 'System', 'admin@gmail.com', hash, 'admin']
        );
        
        console.log("\n✅ Đã tạo admin thành công!");
        console.log("   ID:", result.rows[0].id);
        console.log("   Email:", result.rows[0].email);
        console.log("   Role:", result.rows[0].role);
    } catch (error: any) {
        if (error.code === '23505') {
            console.log("\n⚠️  Admin đã tồn tại, đang cập nhật...");
            await pool.query(
                `UPDATE users SET password = $1, role = 'admin' WHERE email = $2`,
                [hash, 'admin@gmail.com']
            );
            console.log("✅ Đã cập nhật password cho admin!");
        } else {
            console.error("❌ Lỗi:", error.message);
        }
    }
    
    await pool.end();
}

createAdmin();

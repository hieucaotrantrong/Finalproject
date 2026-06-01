const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'hieu@1010',
  database: 'clothes_db_15cc',
  port: 5432,
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT p.id, p.title, p.sold, COALESCE(r.avg_rating,0) AS average_rating
      FROM products p
      LEFT JOIN (
        SELECT product_id, ROUND(AVG(rating)::numeric,1) AS avg_rating
        FROM reviews GROUP BY product_id
      ) r ON r.product_id = p.id
      ORDER BY p.id ASC
    `);

    console.table(res.rows);
  } catch (err) {
    console.error('Error querying products:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();

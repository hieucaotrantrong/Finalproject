import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'hieu@1010',
    database: 'clothes_db_15cc',
    port: 5432,
});

export default pool;

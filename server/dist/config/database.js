"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'hieu@1010',
    database: 'clothes_db_15cc',
    port: 5432,
});
exports.default = pool;

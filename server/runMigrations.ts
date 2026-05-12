import fs from 'fs';
import path from 'path';
import pool from './src/config/database';

const runMigrations = async () => {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration files`);

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ Completed: ${file}`);
    } catch (err) {
      console.error(`✗ Failed: ${file}`);
      console.error((err as Error).message);
    }
  }

  console.log('Migrations completed!');
  process.exit(0);
};

runMigrations().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("./src/config/database"));
const runMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    const migrationsDir = path_1.default.join(process.cwd(), 'migrations');
    const migrationFiles = fs_1.default.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    console.log(`Found ${migrationFiles.length} migration files`);
    for (const file of migrationFiles) {
        const filePath = path_1.default.join(migrationsDir, file);
        const sql = fs_1.default.readFileSync(filePath, 'utf-8');
        try {
            console.log(`Running migration: ${file}`);
            yield database_1.default.query(sql);
            console.log(`✓ Completed: ${file}`);
        }
        catch (err) {
            console.error(`✗ Failed: ${file}`);
            console.error(err.message);
        }
    }
    console.log('Migrations completed!');
    process.exit(0);
});
runMigrations().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});

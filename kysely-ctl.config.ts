import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config();

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'db_lumbung_mesari',
  DB_USER = 'admin',
  DB_PASSWORD = 'admin123',
} = process.env;

export default {
  // Database connection configuration
  db: {
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  },
  
  // Migration configuration
  migrationFolder: resolve(__dirname, './src/database/migrations'),
  
  // Migration table name
  migrationTableName: 'kysely_migrations',
};

import type { Knex } from 'knex'

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5433,
      database: process.env.DB_NAME || 'db_lumbung_mesari',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'admin123'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations'
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT, 10) || 5433,
      database: process.env.TEST_DB_NAME || 'db_lumbung_mesari_test',
      user: process.env.TEST_DB_USER || 'admin',
      password: process.env.TEST_DB_PASSWORD || 'admin123'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Needed for some cloud providers
      }
    },
    pool: {
      min: 2,
      max: 20 // Higher pool for production
    },
    migrations: {
      directory: './dist/database/migrations', // Use compiled migrations in production
      tableName: 'knex_migrations'
    }
  }
}

export default config

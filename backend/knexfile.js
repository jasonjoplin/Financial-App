require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './test.db'
    },
    useNullAsDefault: true,
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME + '_test' || 'financial_ai_db_test',
      user: process.env.DB_USER || 'financial_user',
      password: process.env.DB_PASSWORD || 'password'
    },
    pool: {
      min: 1,
      max: 2
    },
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      directory: '../database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: '../database/seeds'
    }
  }
};
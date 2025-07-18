import knex from 'knex';

const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment as keyof typeof knexConfig];

const db = knex(config);

export default db;
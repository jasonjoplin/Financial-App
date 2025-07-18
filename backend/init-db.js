const knex = require('knex');
const config = require('./knexfile');

async function initDatabase() {
  const db = knex(config.development);
  
  try {
    // Create a simple company and user for demo
    console.log('Creating tables and demo data...');
    
    // Simple tables for demo
    await db.schema.createTable('companies', table => {
      table.string('id').primary().defaultTo('demo-company-id');
      table.string('name').notNullable();
      table.timestamps(true, true);
    });
    
    await db.schema.createTable('users', table => {
      table.string('id').primary().defaultTo('demo-user-id');
      table.string('email').notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.timestamps(true, true);
    });
    
    // Insert demo data
    await db('companies').insert({
      id: 'demo-company-id',
      name: 'Financial AI Demo Company'
    });
    
    await db('users').insert({
      id: 'demo-user-id',
      email: 'test@financialai.com',
      password_hash: '$2b$08$rWS8eWA8Ct7YkgrNHO5a2.uH6WKu9DRZ9pxmLHqFpRQCOyLN8AUaK', // password123
      first_name: 'Demo',
      last_name: 'User'
    });
    
    console.log('Database initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await db.destroy();
  }
}

initDatabase();
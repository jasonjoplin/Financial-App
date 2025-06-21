// Simple test migration for SQLite
const knex = require('knex');
const { v4: uuidv4 } = require('uuid');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './test.db'
  },
  useNullAsDefault: true
});

async function setupTestDatabase() {
  console.log('Setting up test database...\n');
  
  try {
    // Create users table
    await db.schema.dropTableIfExists('users');
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('role').defaultTo('user');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
    console.log('✅ Users table created');

    // Create companies table
    await db.schema.dropTableIfExists('companies');
    await db.schema.createTable('companies', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('accounting_method').defaultTo('accrual');
      table.string('base_currency').defaultTo('USD');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });
    console.log('✅ Companies table created');

    // Create account_types table
    await db.schema.dropTableIfExists('account_types');
    await db.schema.createTable('account_types', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable();
      table.string('normal_balance').notNullable(); // 'debit' or 'credit'
      table.timestamps(true, true);
    });
    console.log('✅ Account types table created');

    // Insert basic account types
    await db('account_types').insert([
      { id: uuidv4(), name: 'Assets', code: 'A', normal_balance: 'debit' },
      { id: uuidv4(), name: 'Liabilities', code: 'L', normal_balance: 'credit' },
      { id: uuidv4(), name: 'Equity', code: 'E', normal_balance: 'credit' },
      { id: uuidv4(), name: 'Revenue', code: 'R', normal_balance: 'credit' },
      { id: uuidv4(), name: 'Expenses', code: 'X', normal_balance: 'debit' }
    ]);
    console.log('✅ Basic account types inserted');

    // Create test user and company
    const userId = uuidv4();
    const companyId = uuidv4();
    
    await db('users').insert({
      id: userId,
      email: 'test@example.com',
      password_hash: '$2a$08$test.hash.for.testing.purposes.only',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin'
    });
    
    await db('companies').insert({
      id: companyId,
      name: 'Test Company LLC'
    });
    
    console.log('✅ Test user and company created');
    console.log(`   User ID: ${userId}`);
    console.log(`   Company ID: ${companyId}`);

    console.log('\n📊 Test database setup completed!');
    console.log('Database file: ./test.db');
    
    return { userId, companyId };
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase().catch(console.error);
}

module.exports = setupTestDatabase;
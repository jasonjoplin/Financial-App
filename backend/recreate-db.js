const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

async function recreateDatabase() {
  try {
    // Create users table
    await knex.schema.createTable('users', table => {
      table.string('id').primary();
      table.string('email').notNullable();
      table.string('password_hash').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.text('role').defaultTo('admin');
      table.timestamps(true, true);
    });
    console.log('✅ Created users table');

    // Create companies table
    await knex.schema.createTable('companies', table => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.timestamps(true, true);
    });
    console.log('✅ Created companies table');

    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 8);
    
    await knex('users').insert({
      id: 'test-user-123',
      email: 'test@example.com',
      password_hash: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      role: 'admin'
    });
    console.log('✅ Created test user: test@example.com / password123');

    // Create test company
    await knex('companies').insert({
      id: 'test-company-123',
      name: 'Test Company'
    });
    console.log('✅ Created test company');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

recreateDatabase();
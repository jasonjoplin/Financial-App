const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

async function fixDatabase() {
  try {
    const hasRole = await knex.schema.hasColumn('users', 'role');
    if (!hasRole) {
      await knex.schema.table('users', table => {
        table.text('role').defaultTo('admin');
      });
      console.log('✅ Added role column');
    } else {
      console.log('✅ Role column already exists');
    }

    // Update existing user to have role
    await knex('users').update({ role: 'admin' });
    console.log('✅ Updated existing users with role');

    // Create test user with known password
    const existingUser = await knex('users').where({ email: 'test@example.com' }).first();
    if (!existingUser) {
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
    } else {
      console.log('✅ Test user already exists');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

fixDatabase();
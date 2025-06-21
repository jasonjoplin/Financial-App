const knex = require('knex');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = knex({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

async function setupTestUser() {
  try {
    console.log('Setting up test user...');
    
    // Clear existing users
    await db('users').del();
    await db('companies').del();
    
    // Create test user
    const userId = uuidv4();
    const companyId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 8);
    
    await db('users').insert({
      id: userId,
      email: 'test@financialai.com',
      password_hash: hashedPassword,
      first_name: 'Test',
      last_name: 'User',
      role: 'admin'
    });
    
    await db('companies').insert({
      id: companyId,
      name: 'Test Financial Company'
    });
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@financialai.com');
    console.log('🔑 Password: password123');
    console.log(`👤 User ID: ${userId}`);
    console.log(`🏢 Company ID: ${companyId}`);
    
    // Test the user
    const user = await db('users').where({ email: 'test@financialai.com' }).first();
    const company = await db('companies').first();
    
    console.log('\n📊 Database verification:');
    console.log('User:', user ? '✅ Found' : '❌ Not found');
    console.log('Company:', company ? '✅ Found' : '❌ Not found');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await db.destroy();
  }
}

setupTestUser();
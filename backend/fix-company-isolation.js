const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

async function fixCompanyIsolation() {
  try {
    // 1. Add company_id column to accounts table
    const hasCompanyId = await knex.schema.hasColumn('accounts', 'company_id');
    if (!hasCompanyId) {
      await knex.schema.table('accounts', table => {
        table.string('company_id');
      });
      console.log('✅ Added company_id column to accounts table');
    } else {
      console.log('✅ company_id column already exists');
    }

    // 2. Create user_companies table for many-to-many relationship
    const hasUserCompanies = await knex.schema.hasTable('user_companies');
    if (!hasUserCompanies) {
      await knex.schema.createTable('user_companies', table => {
        table.string('user_id');
        table.string('company_id');
        table.string('role').defaultTo('admin');
        table.timestamps(true, true);
        table.primary(['user_id', 'company_id']);
      });
      console.log('✅ Created user_companies table');
    } else {
      console.log('✅ user_companies table already exists');
    }

    // 3. Link existing users to their companies
    const users = await knex('users').select('*');
    const companies = await knex('companies').select('*');
    
    for (const user of users) {
      // For now, link each user to the first company (demo setup)
      if (companies.length > 0) {
        const existingLink = await knex('user_companies')
          .where({ user_id: user.id })
          .first();
          
        if (!existingLink) {
          await knex('user_companies').insert({
            user_id: user.id,
            company_id: companies[0].id,
            role: 'admin'
          });
          console.log(`✅ Linked user ${user.email} to company ${companies[0].name}`);
        }
      }
    }

    // 4. Clear existing accounts to give everyone a clean slate
    await knex('accounts').del();
    console.log('✅ Cleared all existing accounts for clean slate');

    console.log('✅ Company isolation setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

fixCompanyIsolation();
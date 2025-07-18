const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: './test.db' },
  useNullAsDefault: true
});

async function addAccountsTable() {
  try {
    const exists = await knex.schema.hasTable('accounts');
    if (!exists) {
      await knex.schema.createTable('accounts', table => {
        table.string('id').primary();
        table.string('code').notNullable().unique();
        table.string('name').notNullable();
        table.string('type').notNullable(); // assets, liabilities, equity, revenue, expenses
        table.string('normal_balance').notNullable(); // debit, credit
        table.text('description');
        table.string('parent_account');
        table.decimal('balance', 15, 2).defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      console.log('✅ Created accounts table');
    } else {
      console.log('✅ Accounts table already exists');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

addAccountsTable();
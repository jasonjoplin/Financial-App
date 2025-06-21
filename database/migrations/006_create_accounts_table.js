exports.up = function(knex) {
  return knex.schema.createTable('accounts', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('account_category_id').notNullable().references('id').inTable('account_categories').onDelete('CASCADE');
    table.uuid('parent_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    table.string('code').notNullable(); // 1001, 1002, 4001, etc.
    table.string('name').notNullable(); // Cash, Accounts Receivable, Sales Revenue, etc.
    table.text('description').nullable();
    table.enum('normal_balance', ['debit', 'credit']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_system_account').defaultTo(false); // Cannot be deleted
    table.decimal('opening_balance', 15, 2).defaultTo(0);
    table.date('opening_balance_date').nullable();
    table.json('tax_settings').nullable(); // Tax line mappings
    table.timestamps(true, true);
    
    table.unique(['company_id', 'code']);
    table.index(['company_id']);
    table.index(['account_category_id']);
    table.index(['parent_account_id']);
    table.index(['code']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('accounts');
};
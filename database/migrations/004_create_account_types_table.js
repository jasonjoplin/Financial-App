exports.up = function(knex) {
  return knex.schema.createTable('account_types', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable(); // Assets, Liabilities, Equity, Revenue, Expenses
    table.string('code').unique().notNullable(); // A, L, E, R, X
    table.text('description').nullable();
    table.enum('normal_balance', ['debit', 'credit']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['code']);
    table.index(['name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('account_types');
};
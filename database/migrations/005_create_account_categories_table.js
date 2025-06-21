exports.up = function(knex) {
  return knex.schema.createTable('account_categories', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('account_type_id').notNullable().references('id').inTable('account_types').onDelete('CASCADE');
    table.string('name').notNullable(); // Current Assets, Fixed Assets, Current Liabilities, etc.
    table.string('code').notNullable(); // 1000, 1100, 2000, etc.
    table.text('description').nullable();
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['account_type_id']);
    table.index(['code']);
    table.index(['sort_order']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('account_categories');
};
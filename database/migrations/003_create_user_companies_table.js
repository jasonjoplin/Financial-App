exports.up = function(knex) {
  return knex.schema.createTable('user_companies', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.enum('role', ['owner', 'admin', 'accountant', 'viewer']).defaultTo('viewer');
    table.json('permissions').nullable(); // Granular permissions
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['user_id', 'company_id']);
    table.index(['user_id']);
    table.index(['company_id']);
    table.index(['role']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_companies');
};
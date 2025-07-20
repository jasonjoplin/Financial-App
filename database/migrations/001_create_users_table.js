exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('phone').nullable();
    table.enum('role', ['admin', 'accountant', 'user']).defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at').nullable();
    table.string('password_reset_token').nullable();
    table.timestamp('password_reset_expires').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['role']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
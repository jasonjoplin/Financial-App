exports.up = function(knex) {
  return knex.schema.createTable('companies', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('legal_name').nullable();
    table.string('tax_id').nullable(); // EIN
    table.string('business_type').nullable(); // LLC, Corp, Partnership, etc.
    table.string('industry').nullable();
    table.text('address').nullable();
    table.string('city').nullable();
    table.string('state').nullable();
    table.string('zip_code').nullable();
    table.string('country').defaultTo('US');
    table.string('phone').nullable();
    table.string('email').nullable();
    table.string('website').nullable();
    table.date('fiscal_year_end').nullable();
    table.enum('accounting_method', ['cash', 'accrual']).defaultTo('accrual');
    table.string('base_currency').defaultTo('USD');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['name']);
    table.index(['tax_id']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('companies');
};
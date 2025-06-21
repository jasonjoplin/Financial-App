exports.up = function(knex) {
  return knex.schema.createTable('vendors', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('vendor_number').notNullable(); // Unique per company
    table.string('name').notNullable();
    table.string('company_name').nullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.text('address').nullable();
    table.string('city').nullable();
    table.string('state').nullable();
    table.string('zip').nullable();
    table.string('country').defaultTo('US');
    table.string('tax_id').nullable(); // For 1099 reporting
    table.enum('payment_terms', ['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']).defaultTo('net_30');
    table.string('payment_method').nullable(); // Check, ACH, etc.
    table.boolean('is_1099_vendor').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.json('custom_fields').nullable();
    table.timestamps(true, true);
    
    table.unique(['company_id', 'vendor_number']);
    table.index(['company_id']);
    table.index(['name']);
    table.index(['email']);
    table.index(['is_1099_vendor']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('vendors');
};
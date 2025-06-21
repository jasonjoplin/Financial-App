exports.up = function(knex) {
  return knex.schema.createTable('customers', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('customer_number').notNullable(); // Unique per company
    table.string('name').notNullable();
    table.string('company_name').nullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.text('billing_address').nullable();
    table.string('billing_city').nullable();
    table.string('billing_state').nullable();
    table.string('billing_zip').nullable();
    table.string('billing_country').defaultTo('US');
    table.text('shipping_address').nullable();
    table.string('shipping_city').nullable();
    table.string('shipping_state').nullable();
    table.string('shipping_zip').nullable();
    table.string('shipping_country').defaultTo('US');
    table.string('tax_id').nullable();
    table.decimal('credit_limit', 15, 2).defaultTo(0);
    table.enum('payment_terms', ['net_15', 'net_30', 'net_60', 'due_on_receipt', 'cash_on_delivery']).defaultTo('net_30');
    table.boolean('is_active').defaultTo(true);
    table.json('custom_fields').nullable();
    table.timestamps(true, true);
    
    table.unique(['company_id', 'customer_number']);
    table.index(['company_id']);
    table.index(['name']);
    table.index(['email']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('customers');
};
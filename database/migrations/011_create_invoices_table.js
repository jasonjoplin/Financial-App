exports.up = function(knex) {
  return knex.schema.createTable('invoices', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.uuid('transaction_id').nullable().references('id').inTable('transactions').onDelete('SET NULL');
    table.string('invoice_number').notNullable(); // Unique per company
    table.date('invoice_date').notNullable();
    table.date('due_date').notNullable();
    table.text('description').nullable();
    table.text('terms').nullable();
    table.decimal('subtotal', 15, 2).notNullable();
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('total_amount', 15, 2).notNullable();
    table.decimal('amount_paid', 15, 2).defaultTo(0);
    table.decimal('amount_due', 15, 2).notNullable();
    table.enum('status', ['draft', 'sent', 'viewed', 'overdue', 'paid', 'void']).defaultTo('draft');
    table.timestamp('sent_at').nullable();
    table.timestamp('viewed_at').nullable();
    table.timestamp('paid_at').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    table.unique(['company_id', 'invoice_number']);
    table.index(['company_id']);
    table.index(['customer_id']);
    table.index(['transaction_id']);
    table.index(['invoice_date']);
    table.index(['due_date']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('invoices');
};
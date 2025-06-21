exports.up = function(knex) {
  return knex.schema.createTable('bills', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
    table.uuid('transaction_id').nullable().references('id').inTable('transactions').onDelete('SET NULL');
    table.string('bill_number').nullable(); // Vendor's bill number
    table.string('reference_number').nullable(); // Our internal reference
    table.date('bill_date').notNullable();
    table.date('due_date').notNullable();
    table.text('description').nullable();
    table.decimal('subtotal', 15, 2).notNullable();
    table.decimal('tax_amount', 15, 2).defaultTo(0);
    table.decimal('total_amount', 15, 2).notNullable();
    table.decimal('amount_paid', 15, 2).defaultTo(0);
    table.decimal('amount_due', 15, 2).notNullable();
    table.enum('status', ['draft', 'pending', 'approved', 'overdue', 'paid', 'void']).defaultTo('draft');
    table.timestamp('approved_at').nullable();
    table.timestamp('paid_at').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    table.index(['company_id']);
    table.index(['vendor_id']);
    table.index(['transaction_id']);
    table.index(['bill_date']);
    table.index(['due_date']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bills');
};
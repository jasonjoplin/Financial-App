exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('transaction_id').nullable().references('id').inTable('transactions').onDelete('SET NULL');
    table.string('payment_number').notNullable(); // Unique per company
    table.date('payment_date').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.enum('type', ['customer_payment', 'vendor_payment']).notNullable();
    table.uuid('entity_id').notNullable(); // customer_id or vendor_id
    table.enum('method', ['cash', 'check', 'credit_card', 'ach', 'wire', 'other']).notNullable();
    table.string('reference').nullable(); // Check number, transaction ID, etc.
    table.text('memo').nullable();
    table.uuid('bank_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    table.enum('status', ['pending', 'cleared', 'void']).defaultTo('pending');
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    table.unique(['company_id', 'payment_number']);
    table.index(['company_id']);
    table.index(['transaction_id']);
    table.index(['payment_date']);
    table.index(['type']);
    table.index(['entity_id']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};
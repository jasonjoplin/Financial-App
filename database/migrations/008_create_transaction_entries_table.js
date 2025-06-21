exports.up = function(knex) {
  return knex.schema.createTable('transaction_entries', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('transaction_id').notNullable().references('id').inTable('transactions').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.decimal('debit_amount', 15, 2).defaultTo(0);
    table.decimal('credit_amount', 15, 2).defaultTo(0);
    table.text('description').nullable();
    table.text('memo').nullable();
    table.integer('line_number').notNullable(); // Order within transaction
    table.uuid('entity_id').nullable(); // Customer, Vendor, Employee ID
    table.string('entity_type').nullable(); // 'customer', 'vendor', 'employee'
    table.json('metadata').nullable(); // Additional context data
    table.timestamps(true, true);
    
    table.index(['transaction_id']);
    table.index(['account_id']);
    table.index(['entity_id', 'entity_type']);
    table.index(['line_number']);
    
    // Ensure debits and credits are mutually exclusive (one must be zero)
    table.check('(debit_amount = 0 AND credit_amount > 0) OR (debit_amount > 0 AND credit_amount = 0)');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transaction_entries');
};
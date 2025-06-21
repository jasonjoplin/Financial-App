exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('transaction_number').notNullable(); // Unique per company
    table.date('transaction_date').notNullable();
    table.date('posting_date').nullable(); // For accrual accounting
    table.string('reference').nullable(); // Invoice number, check number, etc.
    table.text('description').nullable();
    table.text('memo').nullable();
    table.enum('type', ['journal_entry', 'invoice', 'payment', 'deposit', 'transfer', 'adjustment']).notNullable();
    table.enum('status', ['draft', 'pending', 'posted', 'void']).defaultTo('draft');
    table.decimal('total_amount', 15, 2).notNullable();
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();
    table.boolean('is_ai_generated').defaultTo(false);
    table.json('ai_metadata').nullable(); // AI reasoning, confidence, etc.
    table.uuid('recurring_template_id').nullable(); // For recurring transactions
    table.timestamps(true, true);
    
    table.unique(['company_id', 'transaction_number']);
    table.index(['company_id']);
    table.index(['transaction_date']);
    table.index(['posting_date']);
    table.index(['type']);
    table.index(['status']);
    table.index(['created_by']);
    table.index(['is_ai_generated']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};
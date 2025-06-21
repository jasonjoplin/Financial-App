exports.up = function(knex) {
  return knex.schema.createTable('ai_suggestions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('ai_agent_id').notNullable().references('id').inTable('ai_agents').onDelete('CASCADE');
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.enum('type', ['transaction', 'account_mapping', 'tax_entry', 'analysis']).notNullable();
    table.text('title').notNullable(); // Brief description of suggestion
    table.text('description').nullable(); // Detailed explanation
    table.text('reasoning').nullable(); // AI's reasoning
    table.json('original_data').nullable(); // Input data that triggered suggestion
    table.json('suggested_action').nullable(); // Proposed changes/actions
    table.decimal('confidence_score', 3, 2).nullable(); // 0.00 to 1.00
    table.enum('status', ['pending', 'approved', 'rejected', 'implemented']).defaultTo('pending');
    table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_notes').nullable();
    table.uuid('implemented_transaction_id').nullable().references('id').inTable('transactions').onDelete('SET NULL');
    table.timestamp('implemented_at').nullable();
    table.json('metadata').nullable();
    table.timestamps(true, true);
    
    table.index(['ai_agent_id']);
    table.index(['company_id']);
    table.index(['type']);
    table.index(['status']);
    table.index(['reviewed_by']);
    table.index(['confidence_score']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_suggestions');
};
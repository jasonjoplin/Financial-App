exports.up = function(knex) {
  return knex.schema.createTable('ai_agents', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable(); // "Accounting Agent", "Tax Agent"
    table.enum('type', ['accounting', 'tax', 'analysis']).notNullable();
    table.text('description').nullable();
    table.json('configuration').nullable(); // Agent-specific settings
    table.json('rules').nullable(); // Business rules and constraints
    table.decimal('confidence_threshold', 3, 2).defaultTo(0.80); // 0.00 to 1.00
    table.boolean('auto_approve').defaultTo(false); // Auto-approve high confidence suggestions
    table.boolean('is_active').defaultTo(true);
    table.integer('suggestions_made').defaultTo(0);
    table.integer('suggestions_accepted').defaultTo(0);
    table.integer('suggestions_rejected').defaultTo(0);
    table.decimal('accuracy_rate', 5, 2).nullable(); // Calculated accuracy percentage
    table.timestamp('last_activity_at').nullable();
    table.timestamps(true, true);
    
    table.index(['company_id']);
    table.index(['type']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_agents');
};
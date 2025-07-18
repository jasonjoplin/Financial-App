/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('tax_forms', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Form identification
    table.string('form_type', 50).notNullable(); // e.g., '1040', '1120', '1065'
    table.string('form_name', 255).notNullable(); // e.g., 'Individual Income Tax Return'
    table.integer('tax_year').notNullable().defaultTo(new Date().getFullYear());
    
    // Form data
    table.jsonb('form_data').notNullable(); // Contains fields, calculations, etc.
    table.jsonb('original_documents'); // References to uploaded PDFs
    table.jsonb('validation_results'); // Validation errors, warnings, etc.
    
    // Status and confidence
    table.enum('status', [
      'draft',
      'filled', 
      'reviewed',
      'validated',
      'needs_review',
      'completed',
      'filed'
    ]).defaultTo('draft');
    table.decimal('confidence_score', 3, 2); // 0.00 to 1.00
    
    // AI metadata
    table.jsonb('ai_metadata'); // Model used, processing info, etc.
    table.timestamp('validation_date');
    table.timestamp('completion_date');
    table.timestamp('filing_date');
    
    // Audit fields
    table.timestamps(true, true);
    table.boolean('is_active').defaultTo(true);
    
    // Indexes
    table.index(['company_id', 'tax_year']);
    table.index(['company_id', 'status']);
    table.index(['form_type', 'tax_year']);
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('tax_forms');
};
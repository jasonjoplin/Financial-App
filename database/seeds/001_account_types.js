exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('account_types').del();
  
  // Inserts seed entries
  await knex('account_types').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Assets',
      code: 'A',
      description: 'Resources owned by the company that have economic value',
      normal_balance: 'debit',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Liabilities',
      code: 'L',
      description: 'Debts and obligations owed by the company',
      normal_balance: 'credit',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Equity',
      code: 'E',
      description: 'Owner\'s residual interest in the company',
      normal_balance: 'credit',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Revenue',
      code: 'R',
      description: 'Income earned from business operations',
      normal_balance: 'credit',
      is_active: true
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Expenses',
      code: 'X',
      description: 'Costs incurred in earning revenue',
      normal_balance: 'debit',
      is_active: true
    }
  ]);
};
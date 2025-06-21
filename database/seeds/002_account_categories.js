exports.seed = async function(knex) {
  // Get account type IDs
  const accountTypes = await knex('account_types').select('id', 'code');
  const assetsId = accountTypes.find(t => t.code === 'A').id;
  const liabilitiesId = accountTypes.find(t => t.code === 'L').id;
  const equityId = accountTypes.find(t => t.code === 'E').id;
  const revenueId = accountTypes.find(t => t.code === 'R').id;
  const expensesId = accountTypes.find(t => t.code === 'X').id;
  
  // Deletes ALL existing entries
  await knex('account_categories').del();
  
  // Inserts seed entries
  await knex('account_categories').insert([
    // Assets
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: assetsId,
      name: 'Current Assets',
      code: '1000',
      description: 'Assets that can be converted to cash within one year',
      sort_order: 1
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: assetsId,
      name: 'Fixed Assets',
      code: '1500',
      description: 'Long-term assets used in business operations',
      sort_order: 2
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: assetsId,
      name: 'Other Assets',
      code: '1800',
      description: 'Intangible and other long-term assets',
      sort_order: 3
    },
    
    // Liabilities
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: liabilitiesId,
      name: 'Current Liabilities',
      code: '2000',
      description: 'Debts due within one year',
      sort_order: 4
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: liabilitiesId,
      name: 'Long-term Liabilities',
      code: '2500',
      description: 'Debts due after one year',
      sort_order: 5
    },
    
    // Equity
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: equityId,
      name: 'Owner\'s Equity',
      code: '3000',
      description: 'Owner\'s investment and retained earnings',
      sort_order: 6
    },
    
    // Revenue
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: revenueId,
      name: 'Operating Revenue',
      code: '4000',
      description: 'Revenue from primary business activities',
      sort_order: 7
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: revenueId,
      name: 'Other Revenue',
      code: '4500',
      description: 'Revenue from secondary activities',
      sort_order: 8
    },
    
    // Expenses
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: expensesId,
      name: 'Cost of Goods Sold',
      code: '5000',
      description: 'Direct costs of producing goods or services',
      sort_order: 9
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: expensesId,
      name: 'Operating Expenses',
      code: '6000',
      description: 'Expenses from normal business operations',
      sort_order: 10
    },
    {
      id: knex.raw('gen_random_uuid()'),
      account_type_id: expensesId,
      name: 'Other Expenses',
      code: '7000',
      description: 'Non-operating expenses',
      sort_order: 11
    }
  ]);
};
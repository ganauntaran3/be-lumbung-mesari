export const getBalanceResponseSchema = {
  type: 'object',
  properties: {
    total: {
      type: 'number',
      example: 5000000,
      description: 'Total cashbook balance (capital + shu)'
    },
    capital: {
      type: 'number',
      example: 3000000,
      description: 'Capital balance (simpanan pokok + simpanan wajib)'
    },
    shu: {
      type: 'number',
      example: 2000000,
      description: 'SHU balance (profit available for distribution)'
    }
  }
}

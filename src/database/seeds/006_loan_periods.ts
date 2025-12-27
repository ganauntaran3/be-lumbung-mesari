import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  await knex('loan_periods').del()

  const DEFAULT_INTEREST_RATE = 0.01

  const loanPeriods = [
    {
      tenor: 3, // 3 months
      interest_rate: DEFAULT_INTEREST_RATE
    },
    {
      tenor: 6, // 6 months
      interest_rate: DEFAULT_INTEREST_RATE
    },
    {
      tenor: 9, // 9 months
      interest_rate: DEFAULT_INTEREST_RATE
    },
    {
      tenor: 12, // 12 months
      interest_rate: DEFAULT_INTEREST_RATE
    }
  ]

  await knex('loan_periods').insert(loanPeriods)
}

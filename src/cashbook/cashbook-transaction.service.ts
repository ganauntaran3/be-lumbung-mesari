import { Injectable, Logger } from '@nestjs/common'
import { Knex } from 'knex'

import { PaginationResult } from '../interface/pagination'

import { CashbookBalanceRepository } from './cashbook-balance.repository'
import { CashbookTransactionRepository } from './cashbook-transaction.repository'
import { CashbookTransactionResponseDto } from './dto/transaction.dto'
import { CashbookTransactionTable } from './interfaces/transaction.interface'

export interface TransactionFilters {
  dateFrom?: Date
  dateTo?: Date
  type?: 'income' | 'expense'
  userId?: string
  limit?: number
  offset?: number
}

@Injectable()
export class CashbookTransactionService {
  private readonly logger = new Logger(CashbookTransactionService.name)

  constructor(
    private readonly transactionRepository: CashbookTransactionRepository,
    private readonly balanceRepository: CashbookBalanceRepository
  ) {}

  async createIncomeTransaction(
    incomeId: string,
    amount: number,
    destination: 'shu' | 'capital',
    trx: Knex.Transaction,
    txnDate?: Date
  ): Promise<CashbookTransactionTable> {
    try {
      this.logger.log(
        `Creating income transaction: ${incomeId}, amount: ${amount}, destination: ${destination}`
      )

      // Lock and read current balances
      const balances = await trx('cashbook_balances')
        .select('type', 'balance')
        .whereIn('type', ['shu', 'capital', 'total'])
        .forUpdate()

      const shuBefore = parseFloat(
        balances.find((b: any) => b.type === 'shu')?.balance || '0'
      )
      const capitalBefore = parseFloat(
        balances.find((b: any) => b.type === 'capital')?.balance || '0'
      )
      const totalBefore = parseFloat(
        balances.find((b: any) => b.type === 'total')?.balance || '0'
      )

      // Calculate expected balances after transaction
      const shuAmount = destination === 'shu' ? amount : 0
      const capitalAmount = destination === 'capital' ? amount : 0
      const shuAfter = shuBefore + shuAmount
      const capitalAfter = capitalBefore + capitalAmount
      const totalAfter = totalBefore + amount

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || new Date(),
          direction: 'in',
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          shu_balance_before: shuBefore,
          shu_balance_after: shuAfter,
          capital_balance_before: capitalBefore,
          capital_balance_after: capitalAfter,
          total_balance_before: totalBefore,
          total_balance_after: totalAfter,
          income_id: incomeId,
          is_reversal: false,
          reversal_of: null
        },
        trx
      )

      this.logger.log(
        `Income transaction created: ${transaction.id} (Total: ${totalBefore} -> ${totalAfter})`
      )
      return transaction
    } catch (error) {
      this.logger.error(
        `Failed to create income transaction for ${incomeId}:`,
        error
      )
      throw error
    }
  }

  async createExpenseTransaction(
    expenseId: string,
    userId: string,
    shuAmount: number,
    capitalAmount: number,
    trx: Knex.Transaction,
    txnDate?: Date
  ): Promise<CashbookTransactionTable> {
    try {
      const totalAmount = shuAmount + capitalAmount
      this.logger.log(
        `Creating expense transaction: ${expenseId}, shu: ${shuAmount}, capital: ${capitalAmount}, total: ${totalAmount}`
      )

      // Lock and read current balances
      const balances = await trx('cashbook_balances')
        .select('type', 'balance')
        .whereIn('type', ['shu', 'capital', 'total'])
        .forUpdate()

      const shuBefore = parseFloat(
        balances.find((b: any) => b.type === 'shu')?.balance || '0'
      )
      const capitalBefore = parseFloat(
        balances.find((b: any) => b.type === 'capital')?.balance || '0'
      )
      const totalBefore = parseFloat(
        balances.find((b: any) => b.type === 'total')?.balance || '0'
      )

      // Calculate expected balances after transaction
      const shuAfter = shuBefore - shuAmount
      const capitalAfter = capitalBefore - capitalAmount
      const totalAfter = totalBefore - totalAmount

      const transaction = await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || new Date(),
          direction: 'out',
          shu_amount: shuAmount,
          capital_amount: capitalAmount,
          shu_balance_before: shuBefore,
          shu_balance_after: shuAfter,
          capital_balance_before: capitalBefore,
          capital_balance_after: capitalAfter,
          total_balance_before: totalBefore,
          total_balance_after: totalAfter,
          expense_id: expenseId,
          is_reversal: false,
          reversal_of: null
        },
        trx
      )

      this.logger.log(
        `Expense transaction created: ${transaction.id} (Total: ${totalBefore} -> ${totalAfter})`
      )
      return transaction
    } catch (error) {
      this.logger.error(
        `Failed to create expense transaction for ${expenseId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Update cashbook transaction for expense — immutable ledger (Option 2).
   * Never mutates the original row. Instead:
   *   1. Inserts a reversal row (direction='in', is_reversal=true) to undo the original
   *   2. Inserts a new entry row (direction='out') with the corrected amounts
   * The DB trigger handles cashbook_balances on each INSERT automatically.
   */
  async updateExpenseTransaction(
    expenseId: string,
    newShuAmount: number,
    newCapitalAmount: number,
    txnDate?: Date,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(
        `Updating expense transaction for ${expenseId}: shu: ${newShuAmount}, capital: ${newCapitalAmount}`
      )

      const trxRequired = trx!

      // 1. Fetch the original cashbook_transaction row
      const original =
        await this.transactionRepository.findLatestActiveByExpenseId(
          expenseId,
          trxRequired
        )

      if (!original) {
        throw new Error(
          `Cashbook transaction not found for expense ${expenseId}`
        )
      }

      const oldShu = parseFloat(original.shu_amount as unknown as string)
      const oldCapital = parseFloat(
        original.capital_amount as unknown as string
      )

      // 2. Lock and read current balances (snapshot for the reversal row)
      const {
        shu: currentShu,
        capital: currentCapital,
        total: currentTotal
      } = await this.balanceRepository.lockAllForUpdate(trxRequired)

      // 3. Compute snapshots mathematically (avoids a second DB read)
      //    Reversal row (in): adds old amounts back
      const reversalShuAfter = currentShu + oldShu
      const reversalCapitalAfter = currentCapital + oldCapital
      const reversalTotalAfter = currentTotal + (oldShu + oldCapital)

      //    New entry row (out): deducts new amounts from post-reversal state
      const newEntryShuAfter = reversalShuAfter - newShuAmount
      const newEntryCapitalAfter = reversalCapitalAfter - newCapitalAmount
      const newEntryTotalAfter =
        reversalTotalAfter - (newShuAmount + newCapitalAmount)

      // 4. Insert reversal row — trigger adds old amounts back to cashbook_balances
      await this.transactionRepository.createTransaction(
        {
          txn_date: original.txn_date,
          direction: 'in',
          shu_amount: oldShu,
          capital_amount: oldCapital,
          shu_balance_before: currentShu,
          shu_balance_after: reversalShuAfter,
          capital_balance_before: currentCapital,
          capital_balance_after: reversalCapitalAfter,
          total_balance_before: currentTotal,
          total_balance_after: reversalTotalAfter,
          expense_id: expenseId,
          is_reversal: true,
          reversal_of: original.id
        },
        trx
      )

      // 5. Insert new entry row — trigger deducts new amounts from cashbook_balances
      await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || original.txn_date,
          direction: 'out',
          shu_amount: newShuAmount,
          capital_amount: newCapitalAmount,
          shu_balance_before: reversalShuAfter,
          shu_balance_after: newEntryShuAfter,
          capital_balance_before: reversalCapitalAfter,
          capital_balance_after: newEntryCapitalAfter,
          total_balance_before: reversalTotalAfter,
          total_balance_after: newEntryTotalAfter,
          expense_id: expenseId,
          is_reversal: false,
          reversal_of: null
        },
        trx
      )

      this.logger.log(
        `Expense transaction updated (immutable) for ${expenseId}`
      )
    } catch (error) {
      this.logger.error(
        `Failed to update expense transaction for ${expenseId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Update cashbook transaction for income — immutable ledger (Option 2).
   * Never mutates the original row. Instead:
   *   1. Inserts a reversal row (direction='out', is_reversal=true) to undo the original
   *   2. Inserts a new entry row (direction='in') with the corrected amounts
   * The DB trigger handles cashbook_balances on each INSERT automatically.
   */
  async updateIncomeTransaction(
    incomeId: string,
    amount: number,
    destination: 'shu' | 'capital',
    txnDate?: Date,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(
        `Updating income transaction for ${incomeId}: amount: ${amount}, destination: ${destination}`
      )

      const trxRequired = trx!

      const original =
        await this.transactionRepository.findLatestActiveByIncomeId(
          incomeId,
          trxRequired
        )

      if (!original) {
        throw new Error(`Cashbook transaction not found for income ${incomeId}`)
      }

      const oldShu = parseFloat(original.shu_amount as unknown as string)
      const oldCapital = parseFloat(
        original.capital_amount as unknown as string
      )

      const {
        shu: currentShu,
        capital: currentCapital,
        total: currentTotal
      } = await this.balanceRepository.lockAllForUpdate(trxRequired)

      // Reversal row (out): deducts old amounts
      const reversalShuAfter = currentShu - oldShu
      const reversalCapitalAfter = currentCapital - oldCapital
      const reversalTotalAfter = currentTotal - (oldShu + oldCapital)

      // New entry row (in): adds new amounts from post-reversal state
      const newShuAmount = destination === 'shu' ? amount : 0
      const newCapitalAmount = destination === 'capital' ? amount : 0
      const newEntryShuAfter = reversalShuAfter + newShuAmount
      const newEntryCapitalAfter = reversalCapitalAfter + newCapitalAmount
      const newEntryTotalAfter = reversalTotalAfter + amount

      // Insert reversal row — trigger deducts old amounts from cashbook_balances
      await this.transactionRepository.createTransaction(
        {
          txn_date: original.txn_date,
          direction: 'out',
          shu_amount: oldShu,
          capital_amount: oldCapital,
          shu_balance_before: currentShu,
          shu_balance_after: reversalShuAfter,
          capital_balance_before: currentCapital,
          capital_balance_after: reversalCapitalAfter,
          total_balance_before: currentTotal,
          total_balance_after: reversalTotalAfter,
          income_id: incomeId,
          is_reversal: true,
          reversal_of: original.id
        },
        trx
      )

      // Insert new entry row — trigger adds new amounts to cashbook_balances
      await this.transactionRepository.createTransaction(
        {
          txn_date: txnDate || original.txn_date,
          direction: 'in',
          shu_amount: newShuAmount,
          capital_amount: newCapitalAmount,
          shu_balance_before: reversalShuAfter,
          shu_balance_after: newEntryShuAfter,
          capital_balance_before: reversalCapitalAfter,
          capital_balance_after: newEntryCapitalAfter,
          total_balance_before: reversalTotalAfter,
          total_balance_after: newEntryTotalAfter,
          income_id: incomeId,
          is_reversal: false,
          reversal_of: null
        },
        trx
      )

      this.logger.log(`Income transaction updated (immutable) for ${incomeId}`)
    } catch (error) {
      this.logger.error(
        `Failed to update income transaction for ${incomeId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Soft-delete all cashbook transactions for an expense.
   * Because expense_id FK is ON DELETE SET NULL, the expense record will be
   * deleted by the caller AFTER this method runs — the FK will set expense_id
   * to NULL on these rows, but they remain in the table (hidden from history
   * via deleted_at). Balance is reversed manually since no trigger fires on
   * a soft-delete UPDATE.
   */
  async deleteExpenseTransaction(
    expenseId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(
        `Soft-deleting cashbook transactions for expense ${expenseId}`
      )

      const trxRequired = trx!

      const rows = await this.transactionRepository.findAllActiveByExpenseId(
        expenseId,
        trxRequired
      )

      if (!rows.length) return

      let netShu = 0
      let netCapital = 0
      for (const row of rows) {
        const sign = row.direction === 'out' ? -1 : 1
        netShu += sign * parseFloat(row.shu_amount as unknown as string)
        netCapital += sign * parseFloat(row.capital_amount as unknown as string)
      }

      if (netShu !== 0) {
        await this.balanceRepository.adjustBalance('shu', -netShu, trxRequired)
      }
      if (netCapital !== 0) {
        await this.balanceRepository.adjustBalance(
          'capital',
          -netCapital,
          trxRequired
        )
      }
      const netTotal = netShu + netCapital
      if (netTotal !== 0) {
        await this.balanceRepository.adjustBalance(
          'total',
          -netTotal,
          trxRequired
        )
      }

      await this.transactionRepository.softDeleteByExpenseId(
        expenseId,
        trxRequired
      )

      this.logger.log(
        `Cashbook transactions soft-deleted for expense ${expenseId}`
      )
    } catch (error) {
      this.logger.error(
        `Failed to soft-delete cashbook transactions for expense ${expenseId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Soft-delete all cashbook transactions for an income.
   * Same rationale as deleteExpenseTransaction — FK is ON DELETE SET NULL,
   * balance is reversed manually before soft-deleting.
   */
  async deleteIncomeTransaction(
    incomeId: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    try {
      this.logger.log(
        `Soft-deleting cashbook transactions for income ${incomeId}`
      )

      const trxRequired = trx!

      const rows = await this.transactionRepository.findAllActiveByIncomeId(
        incomeId,
        trxRequired
      )

      if (!rows.length) return

      let netShu = 0
      let netCapital = 0
      for (const row of rows) {
        const sign = row.direction === 'out' ? -1 : 1
        netShu += sign * parseFloat(row.shu_amount as unknown as string)
        netCapital += sign * parseFloat(row.capital_amount as unknown as string)
      }

      if (netShu !== 0) {
        await this.balanceRepository.adjustBalance('shu', -netShu, trxRequired)
      }
      if (netCapital !== 0) {
        await this.balanceRepository.adjustBalance(
          'capital',
          -netCapital,
          trxRequired
        )
      }
      const netTotal = netShu + netCapital
      if (netTotal !== 0) {
        await this.balanceRepository.adjustBalance(
          'total',
          -netTotal,
          trxRequired
        )
      }

      await this.transactionRepository.softDeleteByIncomeId(
        incomeId,
        trxRequired
      )

      this.logger.log(
        `Cashbook transactions soft-deleted for income ${incomeId}`
      )
    } catch (error) {
      this.logger.error(
        `Failed to soft-delete cashbook transactions for income ${incomeId}:`,
        error
      )
      throw error
    }
  }

  async listTransactions(
    page: number,
    limit: number
  ): Promise<PaginationResult<CashbookTransactionResponseDto>> {
    try {
      this.logger.log(`Listing transactions: page=${page}, limit=${limit}`)

      const offset = (page - 1) * limit

      const [rows, totalData] = await Promise.all([
        this.transactionRepository.getTransactionsWithCategory({
          limit,
          offset
        }),
        this.transactionRepository.getTransactionCount({})
      ])

      const data: CashbookTransactionResponseDto[] = rows.map((row) => ({
        id: row.id,
        txnDate: row.txn_date,
        type: row.direction === 'in' ? 'income' : 'expense',
        capitalAmount: parseFloat(row.capital_amount),
        shuAmount: parseFloat(row.shu_amount),
        totalBalanceAfter: parseFloat(row.total_balance_after),
        category: {
          id: row.category_id,
          code: row.category_code,
          name: row.category_name
        },
        createdAt: row.created_at
      }))

      const totalPage = Math.ceil(totalData / limit)

      return {
        data,
        page,
        limit,
        totalData,
        totalPage,
        next: page < totalPage,
        prev: page > 1
      }
    } catch (error) {
      this.logger.error('Failed to list transactions:', error)
      throw error
    }
  }

  async getRecentTransactions(
    limit: number = 10
  ): Promise<CashbookTransactionTable[]> {
    try {
      this.logger.log(`Getting ${limit} recent transactions`)

      const transactions =
        await this.transactionRepository.getTransactionsWithFilters({
          limit
        })

      return transactions
    } catch (error) {
      this.logger.error('Failed to get recent transactions:', error)
      throw error
    }
  }
}

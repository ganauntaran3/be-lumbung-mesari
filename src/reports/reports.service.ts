import { Injectable, Logger } from '@nestjs/common'

import * as ExcelJS from 'exceljs'

import { CashbookBalanceRepository } from '../cashbook/cashbook-balance.repository'
import { ExpensesRepository } from '../expenses/expenses.repository'
import { LoansRepository } from '../loans/loans.repository'
import { MandatorySavingsRepository } from '../savings/mandatory-savings.repository'
import { PrincipalSavingsRepository } from '../savings/principal-savings.repository'
import { UsersRepository } from '../users/users.repository'

interface MemberSavingsData {
  userId: string
  fullname: string
  monthlyPayments: (number | null)[] // 12 months, null if not paid
  total: number
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly savingsRepository: MandatorySavingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly loansRepository: LoansRepository,
    private readonly principalSavingsRepository: PrincipalSavingsRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly cashbookBalanceRepository: CashbookBalanceRepository
  ) {}

  async generateMandatorySavingsReport(year: number): Promise<Buffer> {
    this.logger.log(`Generating mandatory savings report for year ${year}`)

    const memberDataMap = new Map<string, MemberSavingsData>()
    const BATCH_SIZE = 100 // Process in batches of 100

    // 1. Fetch all active members using pagination
    this.logger.log('Fetching active members...')
    let memberPage = 1
    let hasNextMembers = true

    while (hasNextMembers) {
      const membersResult = await this.usersRepository.getActiveMembersFullname(
        memberPage,
        BATCH_SIZE
      )

      // Initialize member data
      membersResult.data.forEach((member) => {
        memberDataMap.set(member.id, {
          userId: member.id,
          fullname: member.fullname,
          monthlyPayments: Array(12).fill(null),
          total: 0
        })
      })

      hasNextMembers = membersResult.next
      memberPage++
    }

    console.log(memberDataMap)

    this.logger.log(
      `Initialized ${memberDataMap.size} active members in the report`
    )

    // 2. Fetch all paid mandatory savings for the year using pagination
    this.logger.log(`Fetching paid savings for year ${year}...`)
    let savingsPage = 1
    let hasNextSavings = true
    let totalSavingsProcessed = 0

    while (hasNextSavings) {
      const savingsResult =
        await this.savingsRepository.findPaidMandatorySavingsByYear(
          year,
          savingsPage,
          BATCH_SIZE
        )

      // Process savings data
      savingsResult.data.forEach((saving) => {
        const memberData = memberDataMap.get(saving.user_id)
        if (memberData) {
          const periodDate = new Date(saving.period_date)
          const month = periodDate.getMonth() // 0-11
          const amount = parseFloat(saving.amount)

          memberData.monthlyPayments[month] = amount
          memberData.total += amount
          totalSavingsProcessed++
        }
      })

      hasNextSavings = savingsResult.next
      savingsPage++
    }

    this.logger.log(
      `Processed ${totalSavingsProcessed} paid savings records for year ${year}`
    )

    // 3. Generate Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Simpanan Wajib')

    // Set column widths
    worksheet.columns = [
      { width: 5 }, // NO
      { width: 25 }, // NAMA ANGGOTA
      ...Array(12).fill({ width: 12 }), // Months 1-12
      { width: 15 } // JUMLAH
    ]

    // Header rows (no borders) - merge across all columns
    const header1 = worksheet.addRow(['SEKEHE DEMEN'])
    worksheet.mergeCells(1, 1, 1, 15) // Row 1, columns A to O
    header1.alignment = { horizontal: 'center', vertical: 'middle' }

    const header2 = worksheet.addRow(['LUMBUNG MESARI'])
    worksheet.mergeCells(2, 1, 2, 15) // Row 2, columns A to O
    header2.alignment = { horizontal: 'center', vertical: 'middle' }

    const header3 = worksheet.addRow(['BR. BADUNG SIBANGGEDE'])
    worksheet.mergeCells(3, 1, 3, 15) // Row 3, columns A to O
    header3.alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.addRow([]) // Empty row

    // Define border style
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }

    // Column headers row
    const headerRow = worksheet.addRow([
      'NO',
      'NAMA ANGGOTA',
      'BULAN',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'JUMLAH'
    ])
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Merge BULAN across columns C to N (columns 3-14)
    worksheet.mergeCells(5, 3, 5, 14) // Row 5, columns C to N

    // Apply borders to header row
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
    })

    // Month sub-headers
    const monthRow = worksheet.addRow([
      '',
      '',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      ''
    ])
    monthRow.font = { bold: true }
    monthRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Apply borders to month row
    monthRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
    })

    // Data rows
    const memberDataArray = Array.from(memberDataMap.values()).sort((a, b) =>
      a.fullname.localeCompare(b.fullname)
    )

    memberDataArray.forEach((memberData, index) => {
      const row = worksheet.addRow([
        index + 1,
        memberData.fullname,
        ...memberData.monthlyPayments.map((amount) =>
          amount !== null ? amount : ''
        ),
        memberData.total || ''
      ])

      // Apply borders to data row
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = thinBorder

        // Center align NO column and month columns
        if (colNumber === 1 || (colNumber >= 3 && colNumber <= 14)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }

        // Right align JUMLAH column
        if (colNumber === 15) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        }
      })
    })

    // Calculate monthly totals
    const monthlyTotals = Array(12).fill(0)
    memberDataArray.forEach((memberData) => {
      memberData.monthlyPayments.forEach((amount, monthIndex) => {
        if (amount !== null) {
          monthlyTotals[monthIndex] += amount
        }
      })
    })

    // Footer row with totals
    const totalRow = worksheet.addRow([
      '',
      'JUMLAH',
      ...monthlyTotals.map((total) => (total > 0 ? total : '-')),
      memberDataArray.reduce((sum, m) => sum + m.total, 0)
    ])
    totalRow.font = { bold: true }
    totalRow.alignment = { horizontal: 'center', vertical: 'middle' }

    // Apply borders to total row
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = thinBorder

      // Right align JUMLAH column
      if (colNumber === 15) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      }
    })

    // Add empty rows at the end
    worksheet.addRow([])
    worksheet.addRow([])

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    this.logger.log(
      `Successfully generated report for ${memberDataArray.length} members with ${totalSavingsProcessed} savings records`
    )

    return Buffer.from(buffer)
  }

  async generateMonthlyFinancialReport(
    year: number,
    month: number
  ): Promise<Buffer> {
    this.logger.log(`Generating monthly financial report for ${year}-${month}`)

    // 1. Get opening balance (current balance - we'll show current state)
    const balances = await this.cashbookBalanceRepository.getAllBalances()
    const openingBalance = balances.total || 0

    // 2. Aggregate income data
    const installments =
      await this.loansRepository.getMonthlyInstallmentPayments(year, month)
    const konvenPayments = await this.loansRepository.getKonvenPayments(
      year,
      month
    )
    const mandatorySavings = await this.savingsRepository.getMonthlyTotal(
      year,
      month
    )
    const principalSavings =
      await this.principalSavingsRepository.getMonthlyTotal(year, month)

    // Calculate income categories
    const angsuran = installments.total_principal
    const bunga = installments.total_interest + installments.total_penalty
    const iuran = mandatorySavings + principalSavings
    const konvenTotal = konvenPayments.reduce(
      (sum, k) => sum + k.total_principal,
      0
    )

    // 3. Get expense data
    const expenses = await this.expensesRepository.getMonthlyExpenses(
      year,
      month
    )

    // 4. Calculate totals
    const totalDebet = angsuran + bunga + iuran + konvenTotal
    const totalKredit = expenses.total
    const saldo = openingBalance + totalDebet - totalKredit

    this.logger.log(
      `Report summary - Debet: ${totalDebet}, Kredit: ${totalKredit}, Saldo: ${saldo}`
    )

    // 5. Generate Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Laporan Keuangan')

    // Set column widths
    worksheet.columns = [
      { width: 12 }, // TGL
      { width: 30 }, // KETERANGAN
      { width: 15 }, // DEBET
      { width: 15 }, // KREDIT
      { width: 15 } // SALDO
    ]

    // Header rows
    const header1 = worksheet.addRow(['SEKEHE DEMEN'])
    worksheet.mergeCells(1, 1, 1, 5)
    header1.alignment = { horizontal: 'center', vertical: 'middle' }
    header1.font = { bold: true }

    const header2 = worksheet.addRow(['LUMBUNG MESARI'])
    worksheet.mergeCells(2, 1, 2, 5)
    header2.alignment = { horizontal: 'center', vertical: 'middle' }
    header2.font = { bold: true }

    const header3 = worksheet.addRow(['BR. BADUNG SIBANGGEDE'])
    worksheet.mergeCells(3, 1, 3, 5)
    header3.alignment = { horizontal: 'center', vertical: 'middle' }
    header3.font = { bold: true }

    worksheet.addRow([]) // Empty row

    // Define border style
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }

    // Column headers
    const headerRow = worksheet.addRow([
      'TGL',
      'KETERANGAN',
      'DEBET',
      'KREDIT',
      'SALDO'
    ])
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
    })

    // Helper function to add data row
    const addDataRow = (
      date: string,
      description: string,
      debet: number | string,
      kredit: number | string
    ) => {
      const row = worksheet.addRow([date, description, debet, kredit, ''])
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = thinBorder
        if (colNumber >= 3 && colNumber <= 4) {
          // Debet and Kredit columns
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0'
          }
        }
      })
      return row
    }

    // Opening balance
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember'
    ]
    const prevMonth = month === 1 ? 12 : month - 1
    const prevMonthName = monthNames[prevMonth - 1]
    const prevYear = month === 1 ? year - 1 : year

    addDataRow(
      `${month}/1/${year}`,
      `Saldo bulan lalu (${prevMonthName} ${prevYear})`,
      openingBalance,
      ''
    )

    // Income section
    addDataRow('', 'Penerimaan', '', '')
    if (angsuran > 0) {
      addDataRow('', '  Angsuran', angsuran, '')
    }
    if (bunga > 0) {
      addDataRow('', '  Bunga', bunga, '')
    }
    if (iuran > 0) {
      addDataRow('', '  Iuran', iuran, '')
    }

    // Expenses section
    if (expenses.by_category.length > 0) {
      addDataRow('', 'Pengeluaran kredit', '', '')
      expenses.by_category.forEach((cat) => {
        addDataRow('', `  ${cat.category_name}`, '', cat.amount)
      })
    }

    // Konven section
    if (konvenPayments.length > 0) {
      addDataRow('', 'Pelunasan konven', '', '')
      konvenPayments.forEach((konven) => {
        addDataRow('', `  ${konven.user_fullname}`, konven.total_principal, '')
      })
    }

    // Empty row before totals
    addDataRow('', '', '', '')

    // Totals row
    const totalRow = worksheet.addRow([
      '',
      'TOTAL',
      totalDebet,
      totalKredit,
      saldo
    ])
    totalRow.font = { bold: true }
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = thinBorder
      if (colNumber >= 3 && colNumber <= 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0'
        }
      }
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    this.logger.log(
      `Successfully generated monthly financial report for ${year}-${month}`
    )

    return Buffer.from(buffer)
  }
}

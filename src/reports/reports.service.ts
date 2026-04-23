import { Injectable, Logger } from '@nestjs/common'
import Decimal from 'decimal.js'
import * as ExcelJS from 'exceljs'

import { LoansRepository } from '../loans/loans.repository'
import { MandatorySavingsRepository } from '../savings/mandatory-savings.repository'
import { UsersRepository } from '../users/users.repository'

interface MemberSavingsData {
  userId: string
  fullname: string
  monthlyPayments: (number | null)[] // 12 months, null if not paid
  total: number
}

interface LoanReportRow {
  loanId: string
  userId: string
  borrowerName: string
  loanIndex: number
  principalAmount: number
  monthlyPayment: number | null
  monthlyInterest: number | null
  remainingBalance: number | null
  notes: string
}

interface MonthlyLoanSummary {
  totalPrincipalRepaid: number
  totalInterest: number
  totalMandatorySavings: number
  totalReceipts: number
  disbursedLoans: { name: string; amount: number }[]
  totalDisbursements: number
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly savingsRepository: MandatorySavingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly loansRepository: LoansRepository
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
          monthlyPayments: new Array(12).fill(null),
          total: 0
        })
      })

      hasNextMembers = membersResult.next
      memberPage++
    }

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
          memberData.total = new Decimal(memberData.total)
            .plus(amount)
            .toNumber()
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
          monthlyTotals[monthIndex] = new Decimal(monthlyTotals[monthIndex])
            .plus(amount)
            .toNumber()
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

  async generateMonthlyLoanReport(
    month: number,
    year: number
  ): Promise<Buffer> {
    this.logger.log(`Generating monthly loan report for ${month}/${year}`)

    const BATCH_SIZE = 100
    const monthNames = [
      'JANUARI',
      'FEBRUARI',
      'MARET',
      'APRIL',
      'MEI',
      'JUNI',
      'JULI',
      'AGUSTUS',
      'SEPTEMBER',
      'OKTOBER',
      'NOVEMBER',
      'DESEMBER'
    ]
    const monthName = monthNames[month - 1]

    // 1. Fetch all active members
    this.logger.log('Fetching active members...')
    const memberMap = new Map<
      string,
      { userId: string; fullname: string; loans: LoanReportRow[] }
    >()

    let memberPage = 1
    let hasNextMembers = true
    while (hasNextMembers) {
      const membersResult = await this.usersRepository.getActiveMembersFullname(
        memberPage,
        BATCH_SIZE
      )
      membersResult.data.forEach((member) => {
        memberMap.set(member.id, {
          userId: member.id,
          fullname: member.fullname,
          loans: []
        })
      })
      hasNextMembers = membersResult.next
      memberPage++
    }
    this.logger.log(`Initialized ${memberMap.size} active members`)

    // 2. Fetch all active/completed loans
    this.logger.log('Fetching active loans...')
    const loanList: {
      id: string
      user_id: string
      principal_amount: number
      status: string
    }[] = []
    let loanPage = 1
    let hasNextLoans = true
    while (hasNextLoans) {
      const loansResult = await this.loansRepository.findActiveLoansWithUsers(
        loanPage,
        BATCH_SIZE
      )
      loansResult.data.forEach((loan) => {
        loanList.push({
          id: loan.id,
          user_id: loan.user_id,
          principal_amount: parseFloat(String(loan.principal_amount)),
          status: loan.status
        })
      })
      hasNextLoans = loansResult.next
      loanPage++
    }
    this.logger.log(`Fetched ${loanList.length} active/completed loans`)

    // 3. Fetch paid installments for the report month
    this.logger.log(`Fetching paid installments for ${month}/${year}...`)
    const monthInstallments = new Map<
      string,
      { principal: number; interest: number }
    >()
    let instPage = 1
    let hasNextInst = true
    while (hasNextInst) {
      const instResult = await this.loansRepository.findInstallmentsPaidInMonth(
        month,
        year,
        instPage,
        BATCH_SIZE
      )
      instResult.data.forEach((inst) => {
        const existing = monthInstallments.get(inst.loan_id)
        const principal = parseFloat(inst.principal_amount)
        const interest = parseFloat(inst.interest_amount)
        if (existing) {
          existing.principal = new Decimal(existing.principal)
            .plus(principal)
            .toNumber()
          existing.interest = new Decimal(existing.interest)
            .plus(interest)
            .toNumber()
        } else {
          monthInstallments.set(inst.loan_id, { principal, interest })
        }
      })
      hasNextInst = instResult.next
      instPage++
    }
    this.logger.log(
      `Processed ${monthInstallments.size} installment records for the month`
    )

    // 4. Fetch ALL paid installments for remaining balance calculation
    this.logger.log('Fetching all paid installments for balance calculation...')
    const loanIds = loanList.map((l) => l.id)
    const totalPaidPrincipal = new Map<string, number>()
    if (loanIds.length > 0) {
      const allInstallments =
        await this.loansRepository.findAllPaidInstallmentsByLoanIds(loanIds)
      allInstallments.forEach((inst) => {
        const current = totalPaidPrincipal.get(inst.loan_id) || 0
        totalPaidPrincipal.set(
          inst.loan_id,
          new Decimal(current)
            .plus(parseFloat(inst.principal_amount))
            .toNumber()
        )
      })
    }
    this.logger.log(
      `Calculated remaining balances for ${totalPaidPrincipal.size} loans`
    )

    // 5. Build loan report rows grouped by user
    const userLoans = new Map<string, typeof loanList>()
    loanList.forEach((loan) => {
      const list = userLoans.get(loan.user_id) || []
      list.push(loan)
      userLoans.set(loan.user_id, list)
    })

    // Sort each user's loans by created_at (we don't have created_at in our simplified loan object,
    // but we fetched them ordered by created_at asc, so the list order is already correct)
    userLoans.forEach((loans, userId) => {
      const member = memberMap.get(userId)
      if (!member) return

      loans.forEach((loan, index) => {
        const principalPaid = totalPaidPrincipal.get(loan.id) || 0
        const remaining = new Decimal(loan.principal_amount)
          .minus(principalPaid)
          .toNumber()
        const isCompleted = loan.status === 'completed'

        const monthInst = monthInstallments.get(loan.id)
        const monthlyPayment = monthInst ? monthInst.principal : null
        const monthlyInterest = monthInst ? monthInst.interest : null

        member.loans.push({
          loanId: loan.id,
          userId,
          borrowerName:
            index === 0 ? member.fullname : `${member.fullname} ${index}`,
          loanIndex: index,
          principalAmount: loan.principal_amount,
          monthlyPayment,
          monthlyInterest,
          remainingBalance: isCompleted || remaining <= 0 ? null : remaining,
          notes: isCompleted ? 'LUNAS KONVEN' : ''
        })
      })
    })

    // 6. Fetch loans disbursed in the report month
    this.logger.log(`Fetching loans disbursed in ${month}/${year}...`)
    const disbursedLoans: { name: string; amount: number }[] = []
    let disbursedPage = 1
    let hasNextDisbursed = true
    while (hasNextDisbursed) {
      const disbursedResult =
        await this.loansRepository.findLoansDisbursedInMonth(
          month,
          year,
          disbursedPage,
          BATCH_SIZE
        )
      disbursedResult.data.forEach((loan) => {
        disbursedLoans.push({
          name: loan.fullname,
          amount: parseFloat(loan.principal_amount)
        })
      })
      hasNextDisbursed = disbursedResult.next
      disbursedPage++
    }
    this.logger.log(`Fetched ${disbursedLoans.length} disbursed loans`)

    // 7. Fetch mandatory savings for the report month
    this.logger.log(`Fetching mandatory savings for ${month}/${year}...`)
    let totalMandatorySavings = 0
    let savingsPage = 1
    let hasNextSavings = true
    while (hasNextSavings) {
      const savingsResult =
        await this.savingsRepository.findPaidMandatorySavingsByMonthYear(
          month,
          year,
          savingsPage,
          BATCH_SIZE
        )
      savingsResult.data.forEach((saving) => {
        totalMandatorySavings = new Decimal(totalMandatorySavings)
          .plus(parseFloat(saving.amount))
          .toNumber()
      })
      hasNextSavings = savingsResult.next
      savingsPage++
    }
    this.logger.log(
      `Total mandatory savings for month: ${totalMandatorySavings}`
    )

    // 8. Calculate summary totals
    let totalPrincipalRepaid = 0
    let totalInterest = 0
    memberMap.forEach((member) => {
      member.loans.forEach((loan) => {
        if (loan.monthlyPayment !== null) {
          totalPrincipalRepaid = new Decimal(totalPrincipalRepaid)
            .plus(loan.monthlyPayment)
            .toNumber()
        }
        if (loan.monthlyInterest !== null) {
          totalInterest = new Decimal(totalInterest)
            .plus(loan.monthlyInterest)
            .toNumber()
        }
      })
    })

    const totalReceipts = new Decimal(totalPrincipalRepaid)
      .plus(totalInterest)
      .plus(totalMandatorySavings)
      .toNumber()

    const totalDisbursements = disbursedLoans.reduce(
      (sum, loan) => new Decimal(sum).plus(loan.amount).toNumber(),
      0
    )

    const summary: MonthlyLoanSummary = {
      totalPrincipalRepaid,
      totalInterest,
      totalMandatorySavings,
      totalReceipts,
      disbursedLoans,
      totalDisbursements
    }

    // 9. Generate Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Pinjaman Bulanan')

    // Column widths
    worksheet.columns = [
      { width: 6 }, // NO
      { width: 28 }, // NAMA PEMINJAM
      { width: 16 }, // POKOK PINJAMAN
      { width: 14 }, // ANGSURAN
      { width: 12 }, // BUNGA
      { width: 16 }, // SISA PINJAMAN
      { width: 10 }, // PARAF
      { width: 18 } // KETERANGAN
    ]

    // Borders
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    }

    // Helper to apply thin border to all cells in a row
    const applyBorder = (row: ExcelJS.Row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = thinBorder
      })
    }

    // Header rows
    const header1 = worksheet.addRow(['SEKEHE DEMEN'])
    worksheet.mergeCells(1, 1, 1, 8)
    header1.alignment = { horizontal: 'center', vertical: 'middle' }
    header1.font = { bold: true, size: 14 }

    const header2 = worksheet.addRow(['LUMBUNG MESARI'])
    worksheet.mergeCells(2, 1, 2, 8)
    header2.alignment = { horizontal: 'center', vertical: 'middle' }
    header2.font = { bold: true, size: 14 }

    const header3 = worksheet.addRow(['BR. BADUNG SIBANGGEDE'])
    worksheet.mergeCells(3, 1, 3, 8)
    header3.alignment = { horizontal: 'center', vertical: 'middle' }
    header3.font = { bold: true, size: 12 }

    worksheet.addRow([])

    const periodRow = worksheet.addRow([`PER. ${monthName} ${year}`])
    worksheet.mergeCells(5, 1, 5, 8)
    periodRow.alignment = { horizontal: 'center', vertical: 'middle' }
    periodRow.font = { bold: true }

    worksheet.addRow([])

    // Column headers
    const colHeaders = worksheet.addRow([
      'NO',
      'NAMA PEMINJAM',
      'POKOK PINJAMAN',
      'ANGSURAN',
      'BUNGA',
      'SISA PINJAMAN',
      'PARAF',
      'KETERANGAN'
    ])
    colHeaders.font = { bold: true }
    colHeaders.alignment = { horizontal: 'center', vertical: 'middle' }
    applyBorder(colHeaders)

    // Data rows
    const sortedMembers = Array.from(memberMap.values()).sort((a, b) =>
      a.fullname.localeCompare(b.fullname)
    )

    let rowNumber = 1
    const currencyFormat = '#,##0'

    sortedMembers.forEach((member) => {
      if (member.loans.length === 0) {
        // Member with no loans
        const row = worksheet.addRow([
          rowNumber,
          member.fullname,
          '-',
          '-',
          '-',
          '-',
          '',
          ''
        ])
        applyBorder(row)
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
        for (let c = 3; c <= 6; c++) {
          row.getCell(c).alignment = { horizontal: 'right', vertical: 'middle' }
        }
        rowNumber++
      } else {
        member.loans.forEach((loan, index) => {
          const row = worksheet.addRow([
            index === 0 ? rowNumber : '',
            loan.borrowerName,
            loan.principalAmount,
            loan.monthlyPayment,
            loan.monthlyInterest,
            loan.remainingBalance,
            '',
            loan.notes
          ])
          applyBorder(row)
          row.getCell(1).alignment = {
            horizontal: 'center',
            vertical: 'middle'
          }
          row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
          for (let c = 3; c <= 6; c++) {
            row.getCell(c).alignment = {
              horizontal: 'right',
              vertical: 'middle'
            }
          }
          // Currency format for amount columns
          for (let c = 3; c <= 6; c++) {
            const cell = row.getCell(c)
            if (typeof cell.value === 'number') {
              cell.numFmt = currencyFormat
            }
          }
          if (index === 0) rowNumber++
        })
      }
    })

    // Totals row
    const totalRow = worksheet.addRow([
      '',
      'JUMLAH',
      '',
      summary.totalPrincipalRepaid,
      summary.totalInterest,
      '',
      '',
      ''
    ])
    totalRow.font = { bold: true }
    totalRow.alignment = { horizontal: 'center', vertical: 'middle' }
    applyBorder(totalRow)
    totalRow.getCell(4).numFmt = currencyFormat
    totalRow.getCell(5).numFmt = currencyFormat
    totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
    totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }

    // Empty rows before summary
    worksheet.addRow([])
    worksheet.addRow([])

    // Summary section
    const maxDisbursedRows = Math.max(3, summary.disbursedLoans.length + 1)

    const summaryStartRow = worksheet.rowCount + 1

    // PENERIMAAN header
    const penerimaanHeader = worksheet.addRow([
      '',
      'PENERIMAAN',
      '',
      '',
      'PENGELUARAN KREDIT'
    ])
    worksheet.mergeCells(summaryStartRow, 2, summaryStartRow, 3)
    worksheet.mergeCells(summaryStartRow, 5, summaryStartRow, 6)
    penerimaanHeader.font = { bold: true }
    penerimaanHeader.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    }
    applyBorder(penerimaanHeader)

    // Detail rows
    const summaryRows = [
      {
        leftLabel: '  -ANGS POKOK',
        leftValue: summary.totalPrincipalRepaid,
        rightLabel: summary.disbursedLoans[0]?.name || '',
        rightValue: summary.disbursedLoans[0]?.amount || null
      },
      {
        leftLabel: '  -BUNGA',
        leftValue: summary.totalInterest,
        rightLabel: summary.disbursedLoans[1]?.name || '',
        rightValue: summary.disbursedLoans[1]?.amount || null
      },
      {
        leftLabel: '  -IURAN WAJIB',
        leftValue: summary.totalMandatorySavings,
        rightLabel: 'JUMLAH',
        rightValue: summary.totalDisbursements
      },
      {
        leftLabel: 'JUMLAH',
        leftValue: summary.totalReceipts,
        rightLabel: '',
        rightValue: null
      }
    ]

    summaryRows.forEach((item, idx) => {
      const row = worksheet.addRow([
        '',
        item.leftLabel,
        item.leftValue,
        '',
        item.rightLabel,
        item.rightValue
      ])
      applyBorder(row)
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' }
      if (typeof item.leftValue === 'number') {
        row.getCell(3).numFmt = currencyFormat
      }
      if (typeof item.rightValue === 'number') {
        row.getCell(6).numFmt = currencyFormat
      }
      if (idx === 3) {
        row.font = { bold: true }
      }
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    this.logger.log(
      `Successfully generated monthly loan report for ${month}/${year}`
    )

    return Buffer.from(buffer)
  }
}

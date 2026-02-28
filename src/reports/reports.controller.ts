import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  Res,
  UseGuards
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger'

import { Response } from 'express'

import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { UserRole } from '../common/constants'
import { createUnauthorizedSchema } from '../common/schema/error-schema'

import { ReportsService } from './reports.service'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name)

  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get('mandatory-savings')
  @ApiOperation({
    summary: 'Generate mandatory savings Excel report',
    description:
      'Generate an Excel report showing mandatory savings payment status for all active members across 12 months for a specific year. The report includes monthly payment amounts and totals.'
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for the report (default: current year)',
    example: 2025
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
    schema: createUnauthorizedSchema('Authentication required')
  })
  async generateMandatorySavingsReport(
    @Res() res: Response,
    @Query('year') year?: number
  ) {
    try {
      const reportYear = year || new Date().getFullYear()

      this.logger.log(
        `Generating mandatory savings report for year ${reportYear}`
      )

      const buffer =
        await this.reportsService.generateMandatorySavingsReport(reportYear)

      const filename = `Laporan_Simpanan_Wajib_${reportYear}.xlsx`

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', buffer.length)

      this.logger.log(`Successfully generated report: ${filename}`)

      res.send(buffer)
    } catch (error) {
      this.logger.error('Error generating mandatory savings report:', error)
      throw error
    }
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get('monthly-financial')
  @ApiOperation({
    summary: 'Generate monthly financial report',
    description:
      'Generate an Excel report showing income (installments, interest, savings, konven), expenses, and balance for a specific month. The report includes detailed breakdown by category and running balance.'
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for the report (default: current year)',
    example: 2025
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Month for the report (1-12, default: current month)',
    example: 5
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid month or year parameter'
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
    schema: createUnauthorizedSchema('Authentication required')
  })
  async generateMonthlyFinancialReport(
    @Res() res: Response,
    @Query('year') year?: number,
    @Query('month') month?: number
  ) {
    try {
      const now = new Date()
      const reportYear = year || now.getFullYear()
      const reportMonth = month || now.getMonth() + 1 // getMonth() is 0-indexed

      // Validate month
      if (reportMonth < 1 || reportMonth > 12) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid month. Must be between 1 and 12.',
          error: 'Bad Request'
        })
        return
      }

      // Validate year (reasonable range)
      const currentYear = now.getFullYear()
      if (reportYear < 2000 || reportYear > currentYear + 1) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid year. Must be between 2000 and ${currentYear + 1}.`,
          error: 'Bad Request'
        })
        return
      }

      this.logger.log(
        `Generating monthly financial report for ${reportYear}-${reportMonth}`
      )

      const buffer = await this.reportsService.generateMonthlyFinancialReport(
        reportYear,
        reportMonth
      )

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
      const filename = `Laporan_Keuangan_${monthNames[reportMonth - 1]}_${reportYear}.xlsx`

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', buffer.length)

      this.logger.log(`Successfully generated report: ${filename}`)

      res.send(buffer)
    } catch (error) {
      this.logger.error('Error generating monthly financial report:', error)
      throw error
    }
  }
}

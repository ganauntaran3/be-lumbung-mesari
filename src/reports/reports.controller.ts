import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  Res,
  HttpStatus
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse
} from '@nestjs/swagger'
import { Response } from 'express'

import { JwtAuthGuard } from '../auth/guards/auth.guard'
import { createUnauthorizedSchema } from '../common/schema/error-schema'

import { ReportsService } from './reports.service'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name)

  constructor(private readonly reportsService: ReportsService) {}

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
}

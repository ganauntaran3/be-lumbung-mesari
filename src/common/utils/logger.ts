import {
  ConsoleLogger,
  type ConsoleLoggerOptions,
  LogLevel
} from '@nestjs/common'

export class JsonLogger extends ConsoleLogger {
  constructor(options: ConsoleLoggerOptions) {
    super(options)
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string
      logLevel: LogLevel
      writeStreamType?: 'stdout' | 'stderr'
      errorStack?: unknown
    }
  ): ReturnType<ConsoleLogger['getJsonLogObject']> {
    const logObject = super.getJsonLogObject(message, options)
    const date = new Date(logObject.timestamp)
    const datePart = date.toLocaleDateString('en-CA')
    const timePart = date.toLocaleTimeString('en-GB', { hour12: false })
    const timestamp = `${datePart} ${timePart}`
    return {
      ...logObject,
      timestamp: timestamp as unknown as number
    }
  }
}

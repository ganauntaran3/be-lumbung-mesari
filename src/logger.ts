import { ConsoleLogger, LogLevel } from '@nestjs/common'

export class JsonLogger extends ConsoleLogger {
  protected printAsJson(
    message: unknown,
    options: {
      context: string
      logLevel: LogLevel
      writeStreamType?: 'stdout' | 'stderr'
      errorStack?: unknown
    }
  ): void {
    const logObject = this.getJsonLogObject(message, options)
    const output = {
      ...logObject,
      timestamp: new Date(logObject.timestamp).toISOString()
    }
    const stringified = JSON.stringify(output)
    const formatted = this.options.colors
      ? this.colorize(stringified, options.logLevel)
      : stringified
    const stream =
      options.writeStreamType === 'stderr' ? process.stderr : process.stdout
    stream.write(formatted + '\n')
  }

  protected colorize(message: string, logLevel: LogLevel): string {
    const colorMap: Record<LogLevel, string> = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      log: '\x1b[32m',
      debug: '\x1b[36m',
      verbose: '\x1b[35m',
      fatal: '\x1b[31m'
    }
    const reset = '\x1b[0m'
    return `${colorMap[logLevel]}${message}${reset}`
  }
}

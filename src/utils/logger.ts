/**
 * 🔐 Production-safe logger
 *
 * IMPORTANT: Use this logger instead of console.* for all logging
 *
 * Development: All logs displayed in console
 * Production: Completely silent (all console.* calls removed by Vite)
 *
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   logger.log('Debug info')
 *   logger.error('Error occurred:', error)
 *
 * ESLint rule 'no-console' will warn about direct console.* usage
 */

const isDevelopment = import.meta.env.MODE === 'development'
const isTest = import.meta.env.MODE === 'test'

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

// Type for anything that can be logged
type Loggable = string | number | boolean | null | undefined | Error | object | unknown[] | unknown

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Tests and development: log everything
    if (isDevelopment || isTest) {
      return true
    }
    // Production: only errors (and they'll be stripped by Vite anyway)
    return level === 'error'
  }

  log(...args: Loggable[]): void {
    if (this.shouldLog('log')) {
      // eslint-disable-next-line no-console
      console.log(...args)
    }
  }

  info(...args: Loggable[]): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(...args)
    }
  }

  warn(...args: Loggable[]): void {
    if (this.shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(...args)
    }
  }

  error(...args: Loggable[]): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(...args)
    }
  }

  debug(...args: Loggable[]): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(...args)
    }
  }

  /**
   * Group logs (collapsible in console)
   */
  group(label: string): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.group(label)
    }
  }

  groupEnd(): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }

  /**
   * Display data as table
   */
  table<T extends Record<string, unknown>>(data: T[] | T): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.table(data)
    }
  }

  /**
   * Measure execution time
   */
  time(label: string): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.time(label)
    }
  }

  timeEnd(label: string): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.timeEnd(label)
    }
  }

  /**
   * Trace function (shows call stack)
   */
  trace(...args: Loggable[]): void {
    if (isDevelopment || isTest) {
      // eslint-disable-next-line no-console
      console.trace(...args)
    }
  }
}

export const logger = new Logger()

// Export default for easy import
export default logger

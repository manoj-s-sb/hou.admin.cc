/**
 * Centralized logging utility
 *
 * Best practices:
 * - Use logger.error() for errors that need tracking
 * - Use logger.warn() for warnings
 * - Use logger.info() for informational messages (development only)
 * - Use logger.debug() for detailed debugging (development only)
 * - For user-facing errors, use toast.error() instead
 *
 * In production, only errors are logged to prevent console spam.
 * In development, all log levels are enabled.
 */

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log an error - always logged (even in production)
   * Use this for errors that need to be tracked
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = this.formatError(error);
    const logData = {
      message,
      ...errorDetails,
      ...context,
      timestamp: new Date().toISOString(),
    };

    // Always log errors
    console.error(`[ERROR] ${message}`, logData);

    // In production, you can send to error tracking service here
    // Example: Sentry.captureException(error, { extra: logData });
    if (this.isProduction) {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      // this.sendToErrorTracking(logData);
    }
  }

  /**
   * Log a warning - logged in development, can be logged in production if needed
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, { ...context, timestamp: new Date().toISOString() });
    }
    // Optionally log warnings in production too
    // console.warn(`[WARN] ${message}`, context);
  }

  /**
   * Log informational message - development only
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, { ...context, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Log debug message - development only
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, { ...context, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Format error object for logging
   */
  private formatError(error?: Error | unknown): Record<string, any> {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    if (typeof error === 'object') {
      return { error: JSON.stringify(error) };
    }

    return { error: String(error) };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default for convenience
export default logger;

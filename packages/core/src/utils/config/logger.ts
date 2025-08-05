export interface CoreLogger {
  log(message: string, data?: any): void
  info(message: string, data?: any): void
  error(message: string, error?: any): void
  debug(message: string, data?: any): void
  warn(message: string, data?: any): void
}
export interface CoreContext {
  logger: CoreLogger
}

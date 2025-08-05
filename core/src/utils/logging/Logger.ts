// simple logger wrapper around console methods
import chalk from "chalk"

class FileLogger {
  private logFile: string | null = null
  private logBuffer: string[] = []
  private isNodeEnv: boolean = false
  private fs: any = null
  private path: any = null

  async FileLogger() {
    // check if we're in node.js environment and not in browser
    this.isNodeEnv =
      typeof process !== "undefined" &&
      !!process.versions?.node &&
      typeof window === "undefined"

    if (this.isNodeEnv) {
      try {
        // dynamic imports to avoid bundler issues
        this.fs = await import("fs/promises")
        this.path = await import("path")
      } catch (error) {
        console.warn("failed to load fs modules, file logging disabled")
        this.isNodeEnv = false
      }
    }
  }

  private async writeToFile(message: string): Promise<void> {
    if (!this.logFile || !this.isNodeEnv || !this.fs) return
    try {
      await this.fs.appendFile(this.logFile, message)
    } catch (error) {
      console.error("failed to write to log file:", error)
    }
  }

  async log(...args: any[]): Promise<void> {
    console.log(...args)

    if (this.logFile && this.isNodeEnv) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] ${message}\n`
      await this.writeToFile(logEntry)
    }
  }

  async logAndSave(fileName: string, ...args: any[]): Promise<void> {
    console.log(...args)

    if (typeof window !== "undefined") {
      return
    } else {
      const { saveInLoc } = await import("@runtime/code_tools/file-saver/save")
      saveInLoc(fileName, args)
    }
  }

  async info(...args: any[]): Promise<void> {
    console.info(...args)

    if (this.logFile && this.isNodeEnv) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] INFO: ${message}\n`
      await this.writeToFile(logEntry)
    }
  }

  async warn(...args: any[]): Promise<void> {
    console.warn(chalk.yellow(...args))

    if (this.logFile && this.isNodeEnv) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] WARN: ${message}\n`
      await this.writeToFile(logEntry)
    }
  }

  async error(...args: any[]): Promise<void> {
    const message = args.map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    )
    console.error(chalk.red(message.join(" ")))

    if (this.logFile && this.isNodeEnv) {
      const logMessage = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] ERROR: ${logMessage}\n`
      await this.writeToFile(logEntry)
    }
  }

  async debug(...args: any[]): Promise<void> {
    console.debug(...args)

    if (this.logFile && this.isNodeEnv) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] DEBUG: ${message}\n`
      await this.writeToFile(logEntry)
    }
  }

  async trace(...args: any[]): Promise<void> {
    console.trace(...args)

    if (this.logFile && this.isNodeEnv) {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ")
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] TRACE: ${message}\n`
      await this.writeToFile(logEntry)
    }
  }

  async finalizeWorkflowLog(): Promise<string | null> {
    if (!this.logFile || !this.isNodeEnv) return null

    await this.writeToFile(
      `=== Cultural Evolution Workflow Completed: ${new Date().toISOString()} ===\n`
    )
    const logPath = this.logFile
    this.logFile = null
    return logPath
  }
}

const fileLogger = new FileLogger()

export const lgg = {
  log: (...args: any[]) => fileLogger.log(...args),
  onlyIf: (decider: boolean, ...args: any[]) =>
    decider ? fileLogger.log(...args) : null,
  info: (...args: any[]) => fileLogger.info(...args),
  warn: (...args: any[]) => fileLogger.warn(...args),
  error: (...args: any[]) => fileLogger.error(...args),
  debug: (...args: any[]) => fileLogger.debug(...args),
  trace: (...args: any[]) => fileLogger.trace(...args),
  logAndSave: (fileName: string, ...args: any[]) =>
    fileLogger.logAndSave(fileName, ...args),
  finalizeWorkflowLog: () => fileLogger.finalizeWorkflowLog(),
}

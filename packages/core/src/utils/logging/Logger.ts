// browser-safe logger facade
// no node:* imports here so this file can be bundled for client
// for server-side file logging, import Logger.node.ts directly where needed

export interface Logger {
  log: (...args: any[]) => Promise<void>
  onlyIf: (decider: boolean, ...args: any[]) => Promise<undefined | null>
  info: (...args: any[]) => Promise<void>
  warn: (...args: any[]) => Promise<void>
  error: (...args: any[]) => Promise<void>
  debug: (...args: any[]) => Promise<void>
  trace: (...args: any[]) => Promise<void>
  logAndSave: (fileName: string, ...args: any[]) => Promise<void>
  finalizeWorkflowLog: () => Promise<string | null>
}

export const lgg: Logger = {
  log: async (...args: any[]) => console.log(...args),
  onlyIf: async (decider: boolean, ...args: any[]) => {
    if (decider) {
      console.log(...args)
      return undefined
    }
    return null
  },
  info: async (...args: any[]) => console.info(...args),
  warn: async (...args: any[]) => console.warn(...args),
  error: async (...args: any[]) => console.error(...args),
  debug: async (...args: any[]) => console.debug(...args),
  trace: async (...args: any[]) => console.trace(...args),
  logAndSave: async (_fileName: string, ...args: any[]) => console.log(...args),
  finalizeWorkflowLog: async () => null,
}

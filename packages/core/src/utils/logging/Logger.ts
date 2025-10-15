// browser-safe logger facade
// no node:* imports here so this file can be bundled for client
// for server-side file logging, import Logger.node.ts directly where needed

import type { Loggable, TypeSafeLogger } from "./types"

export const lgg: TypeSafeLogger = {
  log: async <T extends Loggable[]>(...args: T) => console.log(...args),
  onlyIf: async <T extends Loggable[]>(decider: boolean, ...args: T) => {
    if (decider) {
      console.log(...args)
      return undefined
    }
    return null
  },
  info: async <T extends Loggable[]>(...args: T) => console.info(...args),
  warn: async <T extends Loggable[]>(...args: T) => console.warn(...args),
  error: async <T extends Loggable[]>(...args: T) => console.error(...args),
  debug: async <T extends Loggable[]>(...args: T) => console.debug(...args),
  trace: async <T extends Loggable[]>(...args: T) => console.trace(...args),
  logAndSave: async <T extends Loggable[]>(_fileName: string, ...args: T) => console.log(...args),
  finalizeWorkflowLog: async () => null,
}

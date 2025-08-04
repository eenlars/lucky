import type { CoreLogger } from "./logger"
import type { RuntimeProvider } from "../runtime/interfaces"

export interface CoreContext {
  logger: CoreLogger
  runtime: RuntimeProvider
}

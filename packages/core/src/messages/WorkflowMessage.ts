import type { Payload } from "@core/messages/MessagePayload"
import { genShortId } from "@core/utils/common/utils"
import type { TablesUpdate } from "@core/utils/json"
import { lgg } from "@core/utils/logging/Logger"
import { Messages } from "@core/utils/persistence/message/main"

export class WorkflowMessage<P extends Payload = Payload> {
  readonly messageId: string = genShortId()
  readonly originInvocationId: string | null
  readonly fromNodeId: string
  readonly toNodeId: string
  readonly seq: number
  readonly payload: P
  readonly createdAt = new Date().toISOString()
  readonly replyTo?: string
  readonly wfInvId: string
  private readonly skipDatabasePersistence: boolean

  constructor(opts: {
    originInvocationId: string | null
    fromNodeId: string
    toNodeId: string
    seq: number
    payload: P
    replyTo?: string
    wfInvId: string
    skipDatabasePersistence?: boolean
  }) {
    this.originInvocationId = opts.originInvocationId
    this.fromNodeId = opts.fromNodeId
    this.toNodeId = opts.toNodeId
    this.seq = opts.seq
    this.payload = opts.payload
    this.wfInvId = opts.wfInvId
    this.skipDatabasePersistence = opts.skipDatabasePersistence ?? false
    if (opts.replyTo) this.replyTo = opts.replyTo

    if (!this.skipDatabasePersistence) {
      void this.save() // fire-and-forget
    }
  }

  private async save() {
    try {
      await Messages.save(this)
    } catch (error) {
      lgg.error(`Failed to save message ${this.messageId}:`, error)
    }
  }

  async updateMessage(updates: Partial<TablesUpdate<"Message">>) {
    try {
      await Messages.update({ message: this, updates })
    } catch (error) {
      lgg.error(`Failed to update message ${this.messageId}:`, error)
    }
  }
}

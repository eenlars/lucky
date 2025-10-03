import type { Payload } from "@core/messages/MessagePayload"
import { genShortId } from "@core/utils/common/utils"
import { lgg } from "@core/utils/logging/Logger"
import type { TablesUpdate } from "@lucky/shared"
import type { IPersistence, MessageData } from "@together/adapter-supabase"

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
  private readonly persistence?: IPersistence

  constructor(opts: {
    originInvocationId: string | null
    fromNodeId: string
    toNodeId: string
    seq: number
    payload: P
    replyTo?: string
    wfInvId: string
    skipDatabasePersistence?: boolean
    persistence?: IPersistence
  }) {
    this.originInvocationId = opts.originInvocationId
    this.fromNodeId = opts.fromNodeId
    this.toNodeId = opts.toNodeId
    this.seq = opts.seq
    this.payload = opts.payload
    this.wfInvId = opts.wfInvId
    this.skipDatabasePersistence = opts.skipDatabasePersistence ?? false
    this.persistence = opts.persistence
    if (opts.replyTo) this.replyTo = opts.replyTo

    if (!this.skipDatabasePersistence && this.persistence) {
      void this.save() // fire-and-forget
    }
  }

  private async save() {
    if (!this.persistence) return

    try {
      const messageData: MessageData = {
        messageId: this.messageId,
        fromNodeId: this.fromNodeId,
        toNodeId: this.toNodeId,
        originInvocationId: this.originInvocationId || undefined,
        seq: this.seq,
        role: this.payload.kind,
        payload: this.payload,
        createdAt: this.createdAt,
        workflowInvocationId: this.wfInvId,
      }
      await this.persistence.messages.save(messageData)
    } catch (error) {
      lgg.error(`Failed to save message ${this.messageId}:`, error)
    }
  }

  async updateMessage(updates: Partial<TablesUpdate<"Message">>) {
    if (!this.persistence) return

    try {
      await this.persistence.messages.update(this.messageId, updates as Partial<MessageData>)
    } catch (error) {
      lgg.error(`Failed to update message ${this.messageId}:`, error)
    }
  }
}

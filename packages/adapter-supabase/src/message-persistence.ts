/**
 * Message persistence implementation for Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { applyFieldMappings } from "./field-mapper"
import type { IMessagePersistence, MessageData } from "./persistence-interface"

export class SupabaseMessagePersistence implements IMessagePersistence {
  constructor(private client: SupabaseClient) {}

  async save(message: MessageData): Promise<void> {
    const mapped = applyFieldMappings({
      msgId: message.messageId,
      fromNodeId: message.fromNodeId,
      toNodeId: message.toNodeId,
      originInvocationId: message.originInvocationId,
      seq: message.seq,
      role: message.role,
      payload: message.payload,
      createdAt: message.createdAt,
      wfInvocationId: message.workflowInvocationId,
    })

    const { error } = await this.client.from("Message").insert(mapped)

    if (error) {
      throw new Error(`Failed to save message: ${error.message}`)
    }
  }

  async update(messageId: string, updates: Partial<MessageData>): Promise<void> {
    const mapped = applyFieldMappings(updates)

    const { error } = await this.client.from("Message").update(mapped).eq("msg_id", messageId)

    if (error) {
      throw new Error(`Failed to update message "${messageId}": ${error.message}`)
    }
  }
}

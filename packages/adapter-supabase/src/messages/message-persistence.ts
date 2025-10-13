/**
 * Message persistence implementation for Supabase.
 */

import type { TablesInsert } from "@lucky/shared/types/supabase.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { PersistenceError } from "../errors/domain-errors"
import type { IMessagePersistence, MessageData } from "../persistence-interface"
import { applyFieldMappings } from "../utils/field-mapper"

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
    }) as TablesInsert<"Message">

    const { error } = await this.client.from("Message").insert(mapped)

    if (error) {
      throw new PersistenceError(`Failed to save message: ${error.message}`, error)
    }
  }

  async update(messageId: string, updates: Partial<MessageData>): Promise<void> {
    const mapped = applyFieldMappings(updates)

    const { error } = await this.client.from("Message").update(mapped).eq("msg_id", messageId)

    if (error) {
      throw new PersistenceError(`Failed to update message "${messageId}": ${error.message}`, error)
    }
  }
}

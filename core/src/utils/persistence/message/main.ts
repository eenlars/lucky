import type { Json, TablesUpdate } from "@core/utils/clients/supabase/types"
import { lgg } from "@core/utils/logging/Logger"

import type { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { supabase } from "@core/utils/clients/supabase/client"
import type { TablesInsert } from "@core/utils/clients/supabase/types"
import { JSONN } from "@lucky/shared"

export const Messages = {
  save: async (message: WorkflowMessage) => {
    const insertable: TablesInsert<"Message"> = {
      msg_id: message.messageId,
      from_node_id: message.fromNodeId,
      to_node_id: message.toNodeId,
      origin_invocation_id: message.originInvocationId,
      seq: message.seq,
      role: message.payload.kind,
      payload: message.payload as unknown as Json,
      created_at: message.createdAt,
      wf_invocation_id: message.wfInvId,
    }
    const { error } = await supabase.from("Message").insert(insertable)
    if (error) lgg.error("save msg failed", JSONN.show(error))
  },
  update: async ({
    message,
    updates,
  }: {
    message: WorkflowMessage
    updates: Partial<TablesUpdate<"Message">>
  }) => {
    const { error } = await supabase
      .from("Message")
      .update(updates)
      .eq("msg_id", message.messageId)

    if (error) {
      throw new Error(
        `Failed to update message "msg_id": ${message.messageId}: ${error.message}`
      )
    }
  },
}

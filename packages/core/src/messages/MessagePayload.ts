import type { Enums } from "@utils/clients/supabase/types"

// collaboration Types

// OFFLOAD
// delegate: the source node asks the target node to do a task

// INFORM
// teach: the source node will teach the target node something
// status_update: the source node will update the target node on the status of the current task
// acknowledgement: the source node will acknowledge the target node's task

// ASK
// clarification: the source node will clarify the target node's task
// consensus_request: the source node will ask the target node for consensus on a task

// src/core/messages/types.ts
export type MessageType =
  | Enums<"MessageRole">
  | "clarification_request"
  | "clarification_response"
  | "aggregated"

export interface BasePayload {
  kind: MessageType
}

export interface SequentialPayload extends BasePayload {
  kind: "sequential"
  prompt: string
  context?: string
}

export interface DelegationPayload extends BasePayload {
  kind: "delegation"
  prompt: string
  context?: string
}

export interface ShowWorkPayload extends BasePayload {
  kind: "result"
  workDone: string
}

export interface ResultErrorPayload extends BasePayload {
  kind: "result-error"
  message: string
  workDone?: string
}

export interface ErrorPayload extends BasePayload {
  kind: "error"
  message: string
  stack?: string
}

export interface ControlPayload extends BasePayload {
  kind: "control"
  flag: "data" | "error" | "feedback"
}

export interface AggregatedPayload extends BasePayload {
  kind: "aggregated"
  messages: Array<{
    fromNodeId: string
    payload: Payload
  }>
}

export const isDelegationPayload = (
  payload: unknown
): payload is DelegationPayload => {
  return (payload as DelegationPayload).kind === "delegation"
}
export const isShowWorkPayload = (
  payload: unknown
): payload is ShowWorkPayload => {
  return (payload as ShowWorkPayload).kind === "result"
}
export const isResultErrorPayload = (
  payload: unknown
): payload is ResultErrorPayload => {
  return (payload as ResultErrorPayload).kind === "result-error"
}
export const isErrorPayload = (payload: unknown): payload is ErrorPayload => {
  return (payload as ErrorPayload).kind === "error"
}
export const isControlPayload = (
  payload: unknown
): payload is ControlPayload => {
  return (payload as ControlPayload).kind === "control"
}

export const isSequentialPayload = (
  payload: unknown
): payload is SequentialPayload => {
  if (!payload) return false
  return (payload as SequentialPayload).kind === "sequential"
}

export type Payload =
  | DelegationPayload
  | ShowWorkPayload
  | ResultErrorPayload
  | ErrorPayload
  | ControlPayload
  | SequentialPayload
  | AggregatedPayload

export const extractPromptFromPayload = (payload: Payload): string => {
  if ("prompt" in payload && payload.prompt) return payload.prompt
  if ("workDone" in payload && payload.workDone) return payload.workDone
  if ("message" in payload && payload.message) return payload.message
  if ("messages" in payload && payload.messages) {
    return payload.messages.map((m) => m.payload).join("\n")
  }
  return ""
}

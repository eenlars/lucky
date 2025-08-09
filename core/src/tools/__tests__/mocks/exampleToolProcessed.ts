import type { AgentSteps } from "@core/messages/types/AgentStep.types"

export const exampleToolProcessed = {
  type: "tool",
  agentSteps: [
    {
      toolName: "locationDataInfo",
      args: [
        {
          locationDataInfo: {
            action: "verify",
            includeDetails: true,
            workflowInvocationId: "fe9fb958",
          },
        },
        {
          locationDataInfo: {
            action: "summary",
            includeDetails: true,
            workflowInvocationId: "fe9fb958",
          },
        },
      ],
      result: [
        {
          type: "tool-result",
          toolCallId: "call_FTwQV1d1A36GVDLCRQubRQWu",
          toolName: "locationDataInfo",
          args: {
            action: "verify",
            includeDetails: true,
            workflowInvocationId: "fe9fb958",
          },
          result: {
            totalLocations: 0,
            qualityStats: {},
            missingDataCounts: {
              address: 0,
              city: 0,
              coordinates: 0,
              phone: 0,
              email: 0,
            },
            completenessPercentage: null,
          },
        },
        {
          type: "tool-result",
          toolCallId: "call_jX7BuRtjkhrp0Z22TFD1wv9n",
          toolName: "locationDataInfo",
          args: {
            action: "summary",
            includeDetails: true,
            workflowInvocationId: "fe9fb958",
          },
          result: {
            totalLocations: 0,
            qualityStats: {},
            summary: "no locations found",
          },
        },
      ],
      text: "",
      toolCost: 0.0003504,
    },
  ],
  cost: 0.0003504,
}

export const exampleResultExtracted: AgentSteps<any> = [
  {
    type: "tool",
    name: "locationDataInfo",
    args: {
      action: "verify",
      includeDetails: true,
      workflowInvocationId: "fe9fb958",
    },
    return: {
      totalLocations: 0,
      qualityStats: {},
      missingDataCounts: {
        address: 0,
        city: 0,
        coordinates: 0,
        phone: 0,
        email: 0,
      },
      completenessPercentage: null,
    },
  },
  {
    type: "tool",
    name: "locationDataInfo",
    args: {
      action: "summary",
      includeDetails: true,
      workflowInvocationId: "fe9fb958",
    },
    return: {
      totalLocations: 0,
      qualityStats: {},
      summary: "no locations found",
    },
  },
]

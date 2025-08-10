/**
 * businessChain.ts - 10-step complex business process chain with obfuscated function names
 * Tests sequential tool execution through complex workflow
 */
import { tool } from "ai"
import { z } from "zod"

// step 1: request_handler - parses initial request
const RequestHandlerParams = z.object({
  request: z.string().describe("Business request to handle"),
})

export const requestHandlerSpec = tool({
  description: "Handles incoming business requests for processing",
  parameters: RequestHandlerParams,
  execute: async ({ request }: { request: string }) => {
    return request
      .split("")
      .reduce((hash, char) => hash + char.charCodeAt(0), 0)
  },
})

// step 2: compliance_checker - validates hash
const ComplianceCheckerParams = z.object({
  code: z.number().describe("Request code for compliance check"),
})

export const complianceCheckerSpec = tool({
  description: "Checks compliance requirements for business process",
  parameters: ComplianceCheckerParams,
  execute: async ({ code }: { code: number }) => {
    if (code % 3 === 0) return "high"
    if (code % 3 === 1) return "medium"
    return "low"
  },
})

// step 3: risk_assessor - assesses risk level
const RiskAssessorParams = z.object({
  level: z.string().describe("Compliance level for assessment"),
})

export const riskAssessorSpec = tool({
  description: "Assesses risk factors for business compliance",
  parameters: RiskAssessorParams,
  execute: async ({ level }: { level: string }) => {
    if (level === "high") return 1
    if (level === "medium") return 5
    return 9
  },
})

// step 4: resource_allocator - allocates resources
const ResourceAllocatorParams = z.object({
  score: z.number().describe("Risk score for allocation"),
})

export const resourceAllocatorSpec = tool({
  description: "Allocates resources based on risk assessment",
  parameters: ResourceAllocatorParams,
  execute: async ({ score }: { score: number }) => {
    if (score <= 3) return "premium"
    if (score <= 7) return "standard"
    return "basic"
  },
})

// step 5: timeline_planner - plans timeline
const TimelinePlannerParams = z.object({
  team: z.string().describe("Allocated team for planning"),
})

export const timelinePlannerSpec = tool({
  description: "Plans project timeline based on resource allocation",
  parameters: TimelinePlannerParams,
  execute: async ({ team }: { team: string }) => {
    if (team === "premium") return 7
    if (team === "standard") return 14
    return 30
  },
})

// step 6: quality_controller - controls quality
const QualityControllerParams = z.object({
  days: z.number().describe("Timeline days for quality control"),
})

export const qualityControllerSpec = tool({
  description: "Controls quality standards for timeline execution",
  parameters: QualityControllerParams,
  execute: async ({ days }: { days: number }) => {
    if (days <= 10) return "premium"
    if (days <= 20) return "standard"
    return "basic"
  },
})

// step 7: budget_analyzer - analyzes budget
const BudgetAnalyzerParams = z.object({
  quality: z.string().describe("Quality level for budget analysis"),
})

export const budgetAnalyzerSpec = tool({
  description: "Analyzes budget requirements for quality standards",
  parameters: BudgetAnalyzerParams,
  execute: async ({ quality }: { quality: string }) => {
    if (quality === "premium") return 10000
    if (quality === "standard") return 5000
    return 2000
  },
})

// step 8: approval_gateway - processes approval
const ApprovalGatewayParams = z.object({
  cost: z.number().describe("Analyzed cost for approval"),
})

export const approvalGatewaySpec = tool({
  description: "Gateway for approval processing based on budget analysis",
  parameters: ApprovalGatewayParams,
  execute: async ({ cost }: { cost: number }) => {
    if (cost >= 8000) return "executive"
    if (cost >= 4000) return "manager"
    return "supervisor"
  },
})

// step 9: notification_service - sends notifications
const NotificationServiceParams = z.object({
  approver: z.string().describe("Approval level for notifications"),
})

export const notificationServiceSpec = tool({
  description: "Service for sending notifications based on approval gateway",
  parameters: NotificationServiceParams,
  execute: async ({ approver }: { approver: string }) => {
    if (approver === "executive") return 5
    if (approver === "manager") return 3
    return 1
  },
})

// step 10: status_reporter - generates final status
const StatusReporterParams = z.object({
  notifications: z.number().describe("Number of notifications sent"),
})

export const statusReporterSpec = tool({
  description: "Reports final status based on notification processing",
  parameters: StatusReporterParams,
  execute: async ({ notifications }: { notifications: number }) => {
    return `Business process completed: ${notifications} stakeholder${notifications > 1 ? "s" : ""} notified`
  },
})

// combined tools for easy import - will need to be transformed when other specs are updated
export const businessChainTools = {
  request_handler: requestHandlerSpec,
  compliance_checker: complianceCheckerSpec,
  risk_assessor: riskAssessorSpec,
  resource_allocator: resourceAllocatorSpec,
  timeline_planner: timelinePlannerSpec,
  quality_controller: qualityControllerSpec,
  budget_analyzer: budgetAnalyzerSpec,
  approval_gateway: approvalGatewaySpec,
  notification_service: notificationServiceSpec,
  status_reporter: statusReporterSpec,
}

// expected execution order
export const businessChainOrder = [
  "request_handler",
  "compliance_checker",
  "risk_assessor",
  "resource_allocator",
  "timeline_planner",
  "quality_controller",
  "budget_analyzer",
  "approval_gateway",
  "notification_service",
  "status_reporter",
]

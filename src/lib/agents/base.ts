export interface AgentResult {
  success: boolean
  summary: string
  data: unknown
}

export interface ScheduledPlan {
  categoryId: string | null
  count: number
  topicFocus: string
}

export interface AgentRunOptions {
  db: D1Database
  env: CloudflareEnv
  taskId: string
  userId?: string
  scheduledPlan?: ScheduledPlan
}

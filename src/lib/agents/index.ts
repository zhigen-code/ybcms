import { createAITask, updateAITask } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { runContentAgent } from './content-agent'
import { runSEOAgent } from './seo-agent'
import type { AgentResult, ScheduledPlan } from './base'

export type AgentType = 'content' | 'seo'

export async function runAgent(
  type: AgentType,
  env: CloudflareEnv,
  userId?: string,
  extra?: { scheduledPlan?: ScheduledPlan }
): Promise<{ taskId: string; result: AgentResult }> {
  const db = env.DB
  const taskId = generateId()
  const now = Math.floor(Date.now() / 1000)

  await createAITask(db, { id: taskId, type, input: { agent: type, triggeredAt: now } })
  await updateAITask(db, taskId, { status: 'running' })

  try {
    const ctx = { db, env, taskId, userId, scheduledPlan: extra?.scheduledPlan }
    const result = type === 'content'
      ? await runContentAgent(ctx)
      : await runSEOAgent(ctx)

    await updateAITask(db, taskId, {
      status: result.success ? 'done' : 'failed',
      output: result.data,
      error: result.success ? null : result.summary,
      completed_at: Math.floor(Date.now() / 1000),
    })

    return { taskId, result }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await updateAITask(db, taskId, {
      status: 'failed',
      error: msg,
      completed_at: Math.floor(Date.now() / 1000),
    })
    return { taskId, result: { success: false, summary: msg, data: null } }
  }
}

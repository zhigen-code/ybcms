/**
 * Cron trigger endpoint — called by an external scheduler (Cloudflare Worker, cron job, etc.)
 *
 * When ai.schedule.enabled is true, the content agent runs with schedule logic:
 * daily cap check → random article count → weighted category selection.
 * Timing is fully controlled by the external caller.
 *
 * Manual test:
 *   curl -X POST /api/cron \
 *     -H "Authorization: Bearer <CRON_SECRET>" \
 *     -d '{"agents":["content"]}'
 */
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { runAgent } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import type { ScheduledPlan } from '@/lib/agents/base'
import { z } from 'zod'
import { listUsers, publishScheduled } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import type { CategoryPlan } from '@/types'

const schema = z.object({
  agents: z.array(z.enum(['content', 'seo', 'review'])).default(['content', 'review']),
})

function weightedPick(plans: CategoryPlan[]): CategoryPlan {
  const total = plans.reduce((s, p) => s + Math.max(1, p.weight ?? 1), 0)
  let r = Math.random() * total
  for (const plan of plans) {
    r -= Math.max(1, plan.weight ?? 1)
    if (r <= 0) return plan
  }
  return plans[plans.length - 1]
}

async function countPublishedToday(db: D1Database): Promise<number> {
  const nowSec = Math.floor(Date.now() / 1000)
  const midnightSec = nowSec - (nowSec % 86400)
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM contents WHERE type='post' AND status='published' AND published_at >= ?")
    .bind(midnightSec)
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext()

  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: '未授权，请提供有效的 CRON_SECRET' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  const agents = parsed.success ? parsed.data.agents : ['content', 'seo']

  const users = await listUsers(env.DB)
  const adminUser = users.find(u => u.role === 'admin')
  const userId = adminUser?.id

  // Publish any scheduled content that's due
  let scheduledResult: { published: number; ids: string[] } = { published: 0, ids: [] }
  try {
    scheduledResult = await publishScheduled(env.DB)
  } catch (err) {
    console.error('publishScheduled error', err)
  }

  const results: Record<string, unknown> = {}

  for (const agent of agents) {
    if (agent === 'content') {
      const settings = await getSiteSettings(env.DB)
      const scheduleEnabled = Boolean(settings['ai.schedule.enabled'])

      if (scheduleEnabled) {
        const runMin = Math.max(1, Number(settings['ai.schedule.runMin'] ?? 1))
        const runMax = Math.max(runMin, Number(settings['ai.schedule.runMax'] ?? 1))
        const dailyMax = Math.max(1, Number(settings['ai.schedule.dailyMax'] ?? 10))
        const categoryPlans = (settings['ai.content.categoryPlans'] as CategoryPlan[]) ?? []
        const siteTopics = (settings['ai.content.siteTopics'] as string) || ''

        const todayCount = await countPublishedToday(env.DB)
        if (todayCount >= dailyMax) {
          results[agent] = { skipped: true, reason: `今日已发布 ${todayCount} 篇，已达每日上限 ${dailyMax}` }
          continue
        }

        const remaining = dailyMax - todayCount
        const rawCount = runMin + Math.floor(Math.random() * (runMax - runMin + 1))
        const articleCount = Math.min(rawCount, remaining)

        let scheduledPlan: ScheduledPlan
        if (categoryPlans.length > 0) {
          const picked = weightedPick(categoryPlans)
          scheduledPlan = { categoryId: picked.categoryId, count: articleCount, topicFocus: picked.topicFocus || siteTopics }
        } else {
          scheduledPlan = { categoryId: null, count: articleCount, topicFocus: siteTopics }
        }

        try {
          const { taskId, result } = await runAgent('content', env, userId, { scheduledPlan })
          results[agent] = { taskId, scheduled: true, scheduledPlan, ...result }
        } catch (err) {
          console.error('[cron] content agent failed', err)
          results[agent] = { success: false, error: '执行失败' }
        }
      } else {
        try {
          const { taskId, result } = await runAgent('content', env, userId)
          results[agent] = { taskId, ...result }
        } catch (err) {
          console.error('[cron] content agent failed', err)
          results[agent] = { success: false, error: '执行失败' }
        }
      }
    } else {
      try {
        const { taskId, result } = await runAgent(agent as AgentType, env, userId)
        results[agent] = { taskId, ...result }
      } catch (err) {
        console.error(`[cron] agent ${agent} failed`, err)
        results[agent] = { success: false, error: '执行失败' }
      }

    }
  }

  return Response.json({ ok: true, scheduled: scheduledResult, results })
}

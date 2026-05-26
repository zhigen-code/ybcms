/**
 * Cron trigger endpoint.
 *
 * Production wiring (Cloudflare Workers):
 *   Deploy a tiny Worker with [triggers] crons = ["0 * * * *"] (every hour) whose
 *   scheduled() handler does:
 *     await fetch('https://your-site.pages.dev/api/cron', {
 *       method: 'POST',
 *       headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
 *       body: JSON.stringify({ agents: ['content', 'seo'] }),
 *     })
 *
 *   When ai.schedule.enabled is true, the endpoint applies a time-gate:
 *   it only runs the content agent if the current local hour matches one of
 *   the configured slots and the daily cap has not been reached.
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
  agents: z.array(z.enum(['content', 'seo'])).default(['content', 'seo']),
})

// Weighted random pick (no replacement needed — just pick one category per run)
function weightedPick(plans: CategoryPlan[]): CategoryPlan {
  const total = plans.reduce((s, p) => s + Math.max(1, p.weight ?? 1), 0)
  let r = Math.random() * total
  for (const plan of plans) {
    r -= Math.max(1, plan.weight ?? 1)
    if (r <= 0) return plan
  }
  return plans[plans.length - 1]
}

// Count content published since midnight (UTC+offset)
async function countPublishedToday(db: D1Database, tzOffsetHours: number): Promise<number> {
  const nowMs = Date.now()
  const offsetMs = tzOffsetHours * 3600 * 1000
  const localMs = nowMs + offsetMs
  const localDate = new Date(localMs)
  const midnightLocal = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()))
  const midnightUtc = Math.floor((midnightLocal.getTime() - offsetMs) / 1000)
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM contents WHERE type='post' AND status='published' AND published_at >= ?")
    .bind(midnightUtc)
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

  // 定时发布：先将到期的 scheduled 内容切换为 published
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
        // ── 时间门控模式 ──────────────────────────────────────────
        const hours = (settings['ai.schedule.hours'] as number[] | undefined) ?? []
        const tz = Number(settings['ai.schedule.timezone'] ?? 8)
        const runMin = Math.max(1, Number(settings['ai.schedule.runMin'] ?? 1))
        const runMax = Math.max(runMin, Number(settings['ai.schedule.runMax'] ?? 1))
        const dailyMax = Math.max(1, Number(settings['ai.schedule.dailyMax'] ?? 10))
        const categoryPlans = (settings['ai.content.categoryPlans'] as CategoryPlan[]) ?? []
        const siteTopics = (settings['ai.content.siteTopics'] as string) || ''

        // Current local hour
        const localHour = new Date(Date.now() + tz * 3600000).getUTCHours()

        if (hours.length > 0 && !hours.includes(localHour)) {
          results[agent] = { skipped: true, reason: `当前时间 ${localHour}:xx 不在发布时段 [${hours.join(',')}]` }
          continue
        }

        // Daily cap check
        const todayCount = await countPublishedToday(env.DB, tz)
        if (todayCount >= dailyMax) {
          results[agent] = { skipped: true, reason: `今日已发布 ${todayCount} 篇，已达每日上限 ${dailyMax}` }
          continue
        }

        // Random count, capped by remaining daily quota
        const remaining = dailyMax - todayCount
        const rawCount = runMin + Math.floor(Math.random() * (runMax - runMin + 1))
        const articleCount = Math.min(rawCount, remaining)

        // Weighted category selection
        let scheduledPlan: ScheduledPlan
        if (categoryPlans.length > 0) {
          const picked = weightedPick(categoryPlans)
          scheduledPlan = {
            categoryId: picked.categoryId,
            count: articleCount,
            topicFocus: picked.topicFocus || siteTopics,
          }
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
        // ── 普通模式（不启用计划，每次都执行） ────────────────────
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

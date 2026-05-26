import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getSiteSettings } from '@/lib/config'
import { runAgent } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import type { ScheduledPlan } from '@/lib/agents/base'
import { listUsers } from '@/lib/db'
import type { CategoryPlan } from '@/types'

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

export async function GET(request: Request) {
  const { env } = getCloudflareContext()
  const url = new URL(request.url)

  const token = url.searchParams.get('token') ?? ''
  const agent = (url.searchParams.get('agent') ?? 'content') as AgentType
  const mode = url.searchParams.get('mode') ?? ''

  if (!token) {
    return Response.json({ error: '缺少 token 参数' }, { status: 400 })
  }
  if (!['content', 'seo', 'review'].includes(agent)) {
    return Response.json({ error: 'agent 参数无效，可选 content / review / seo' }, { status: 400 })
  }

  const settings = await getSiteSettings(env.DB)
  const triggerToken = settings['ai.trigger.token'] as string | undefined

  if (!triggerToken || token !== triggerToken) {
    return Response.json({ error: '无效的触发 Token' }, { status: 401 })
  }

  const users = await listUsers(env.DB)
  const adminUser = users.find(u => u.role === 'admin')

  // Schedule mode: apply daily cap + random count + weighted category selection
  if (mode === 'schedule' && agent === 'content') {
    const runMin = Math.max(1, Number(settings['ai.schedule.runMin'] ?? 1))
    const runMax = Math.max(runMin, Number(settings['ai.schedule.runMax'] ?? 1))
    const dailyMax = Math.max(1, Number(settings['ai.schedule.dailyMax'] ?? 10))
    const categoryPlans = (settings['ai.content.categoryPlans'] as CategoryPlan[]) ?? []
    const siteTopics = (settings['ai.content.siteTopics'] as string) || ''

    const todayCount = await countPublishedToday(env.DB)
    if (todayCount >= dailyMax) {
      return Response.json({ ok: true, skipped: true, reason: `今日已发布 ${todayCount} 篇，已达每日上限 ${dailyMax}` })
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
      const { taskId, result } = await runAgent('content', env, adminUser?.id, { scheduledPlan })
      return Response.json({ ok: true, taskId, scheduledPlan, ...result })
    } catch (err) {
      console.error('[schedule trigger]', err)
      return Response.json({ ok: false, error: '执行失败' }, { status: 500 })
    }
  }

  // Normal mode: run agent as-is (full manual run)
  try {
    const { taskId, result } = await runAgent(agent, env, adminUser?.id)
    return Response.json({ ok: true, taskId, ...result })
  } catch (err) {
    console.error('[agent trigger]', err)
    return Response.json({ ok: false, error: '执行失败' }, { status: 500 })
  }
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { requireAdmin } from '@/lib/auth'
import { getCurrentUserWithApiKey } from '@/lib/apiKeyAuth'
import { runAgent } from '@/lib/agents'
import type { AgentType } from '@/lib/agents'
import { listUsers } from '@/lib/db'
import { z } from 'zod'


const schema = z.object({
  agent: z.enum(['content', 'seo', 'review']),
})

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUserWithApiKey(request, env)

  // API Key 路径：只需要 agent:run 权限
  if (user?.permissions) {
    if (!user.permissions.includes('agent:run')) {
      return Response.json({ error: '该 API Key 无 agent:run 权限' }, { status: 403 })
    }
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: '无效参数' }, { status: 400 })
    const users = await listUsers(env.DB)
    const adminUser = users.find(u => u.role === 'admin')
    const { taskId, result } = await runAgent(parsed.data.agent as AgentType, env, adminUser?.id)
    return Response.json({ taskId, ...result }, { status: result.success ? 200 : 500 })
  }

  // 普通 JWT 路径
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: '无效参数' }, { status: 400 })

  const { taskId, result } = await runAgent(parsed.data.agent as AgentType, env, user!.userId)
  return Response.json({ taskId, ...result }, { status: result.success ? 200 : 500 })
}

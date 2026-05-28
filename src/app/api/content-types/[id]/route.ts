import { getCloudflareContext } from '@opennextjs/cloudflare'
import { updateContentType, deleteContentType } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  const body = await request.json() as {
    name?: string; icon?: string
    has_timeline?: boolean; has_author?: boolean
    has_category?: boolean; has_tag?: boolean
    fields?: unknown[]
  }
  await updateContentType(env.DB, id, body)
  return Response.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params

  const [contentCount, categoryCount] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as n FROM contents WHERE type = ?').bind(id).first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) as n FROM categories WHERE content_type = ?').bind(id).first<{ n: number }>(),
  ])
  if (contentCount && contentCount.n > 0) {
    return Response.json({ error: `该类型下有 ${contentCount.n} 篇内容，请先删除后再删除此类型` }, { status: 409 })
  }
  if (categoryCount && categoryCount.n > 0) {
    return Response.json({ error: `该类型下有 ${categoryCount.n} 个分类，请先删除后再删除此类型` }, { status: 409 })
  }

  await deleteContentType(env.DB, id)
  return Response.json({ ok: true })
}

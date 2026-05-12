import { getCloudflareContext } from '@opennextjs/cloudflare'
import { updateTag, deleteTag } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  const { name } = await request.json() as { name: string }
  if (!name?.trim()) return Response.json({ error: '名称不能为空' }, { status: 400 })

  await updateTag(env.DB, id, { name: name.trim(), slug: slugify(name.trim()) || id })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  await deleteTag(env.DB, id)
  return Response.json({ ok: true })
}

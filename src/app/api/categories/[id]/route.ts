import { getCloudflareContext } from '@opennextjs/cloudflare'
import { updateCategory, deleteCategory } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/utils'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  const { name, description, parent_id } = await request.json() as { name?: string; description?: string; parent_id?: string | null }
  if (!name?.trim()) return Response.json({ error: '名称不能为空' }, { status: 400 })

  await updateCategory(env.DB, id, {
    name: name.trim(),
    slug: slugify(name.trim()) || id,
    description: description ?? null,
    parent_id: parent_id ?? null,
  })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  await deleteCategory(env.DB, id)
  return Response.json({ ok: true })
}

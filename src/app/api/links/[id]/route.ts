import { getCloudflareContext } from '@opennextjs/cloudflare'
import { updateLink, deleteLink } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  const body = await request.json() as {
    name?: string; url?: string; description?: string; logo?: string
    sort_order?: number; status?: string
  }
  if (body.name !== undefined && !body.name.trim())
    return Response.json({ error: '名称不能为空' }, { status: 400 })
  if (body.url !== undefined && !body.url.trim())
    return Response.json({ error: 'URL 不能为空' }, { status: 400 })

  await updateLink(env.DB, id, {
    name:        body.name?.trim(),
    url:         body.url?.trim(),
    description: body.description !== undefined ? (body.description.trim() || null) : undefined,
    logo:        body.logo        !== undefined ? (body.logo.trim()        || null) : undefined,
    sort_order:  body.sort_order,
    status:      body.status === 'hidden' ? 'hidden' : body.status === 'active' ? 'active' : undefined,
  })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { id } = await params
  await deleteLink(env.DB, id)
  return Response.json({ ok: true })
}

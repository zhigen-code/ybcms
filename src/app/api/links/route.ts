import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getLinks, createLink } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { generateId } from '@/lib/utils'

export async function GET(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const links = await getLinks(env.DB, true)
  return Response.json(links)
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await request.json() as {
    name?: string; url?: string; description?: string; logo?: string
    sort_order?: number; status?: string
  }
  if (!body.name?.trim()) return Response.json({ error: '名称不能为空' }, { status: 400 })
  if (!body.url?.trim())  return Response.json({ error: 'URL 不能为空' }, { status: 400 })

  const id = generateId()
  await createLink(env.DB, {
    id,
    name: body.name.trim(),
    url: body.url.trim(),
    description: body.description?.trim() || null,
    logo: body.logo?.trim() || null,
    sort_order: body.sort_order ?? 0,
    status: (body.status === 'hidden' ? 'hidden' : 'active'),
  })
  return Response.json({ id }, { status: 201 })
}

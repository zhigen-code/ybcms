import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContentTypes, createContentType } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { generateId, slugify } from '@/lib/utils'

export async function GET() {
  const { env } = getCloudflareContext()
  const types = await getContentTypes(env.DB)
  return Response.json(types)
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await request.json() as {
    name: string; icon?: string
    has_timeline?: boolean; has_author?: boolean
    has_category?: boolean; has_tag?: boolean
    fields?: unknown[]
  }
  if (!body.name?.trim()) return Response.json({ error: '名称不能为空' }, { status: 400 })

  const id = generateId()
  const slug = slugify(body.name.trim()).replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || id
  await createContentType(env.DB, {
    id, name: body.name.trim(), slug,
    icon: body.icon,
    has_timeline: body.has_timeline ?? false,
    has_author: body.has_author ?? true,
    has_category: body.has_category ?? true,
    has_tag: body.has_tag ?? true,
    fields: body.fields ?? [],
  })
  return Response.json({ id, name: body.name.trim(), slug }, { status: 201 })
}

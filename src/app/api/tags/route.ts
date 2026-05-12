import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getTagsWithCount, createTag } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { generateId, slugify } from '@/lib/utils'

export async function GET() {
  const { env } = getCloudflareContext()
  const tags = await getTagsWithCount(env.DB)
  return Response.json(tags)
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { name } = await request.json() as { name: string }
  if (!name?.trim()) return Response.json({ error: '名称不能为空' }, { status: 400 })

  const id = generateId()
  const slug = slugify(name.trim()).replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || id
  await createTag(env.DB, { id, name: name.trim(), slug })
  return Response.json({ id, name: name.trim(), slug, count: 0 }, { status: 201 })
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getCategories, createCategory } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { generateId, slugify } from '@/lib/utils'


// GET /api/categories?type=post
export async function GET(request: Request) {
  const { env } = getCloudflareContext()
  const type = new URL(request.url).searchParams.get('type') ?? 'post'
  const categories = await getCategories(env.DB, type)
  return Response.json(categories)
}

// POST /api/categories
export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { name, content_type, description, parent_id } = await request.json() as { name: string; content_type: string; description?: string; parent_id?: string }
  if (!name?.trim() || !content_type) return Response.json({ error: '参数不完整' }, { status: 400 })

  const id = generateId()
  const slug = slugify(name).replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || id
  await createCategory(env.DB, { id, content_type, name: name.trim(), slug, parent_id, description })
  return Response.json({ id, name: name.trim(), slug, content_type, parent_id: parent_id ?? null }, { status: 201 })
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getMediaList, createMedia, updateMedia } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getStorageDriver, generateMediaKey, isAllowedMimeType } from '@/lib/storage'
import { generateId } from '@/lib/utils'
import { generateImageAlt } from '@/lib/ai'


export async function GET(request: Request) {
  const { env } = getCloudflareContext()
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? 1)
  const result = await getMediaList(env.DB, page, 30)
  return Response.json(result)
}

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: '未提供文件' }, { status: 400 })
  if (!isAllowedMimeType(file.type)) return Response.json({ error: '不支持的文件类型' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: '文件超过 20MB 限制' }, { status: 400 })

  const suggestedKey = generateMediaKey(file.name)
  const buffer = await file.arrayBuffer()
  const storage = await getStorageDriver(env)
  const { url, key: r2Key } = await storage.upload(suggestedKey, buffer, file.type)

  const id = generateId()
  await createMedia(env.DB, {
    id,
    filename: file.name,
    r2_key: r2Key,
    url,
    mime_type: file.type,
    size: file.size,
    width: null,
    height: null,
    alt: null,
    ai_alt: null,
    uploaded_by: user!.userId,
  })

  // 异步生成 alt（不阻塞响应）
  if (file.type.startsWith('image/')) {
    generateImageAlt(env, buffer).then(aiAlt => {
      if (aiAlt) updateMedia(env.DB, id, { ai_alt: aiAlt })
    }).catch(() => {})
  }

  return Response.json({ id, url, filename: file.name }, { status: 201 })
}

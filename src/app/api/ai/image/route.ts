import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { generateImage } from '@/lib/ai'
import { getStorageDriver } from '@/lib/storage'
import { generateId } from '@/lib/utils'

export async function POST(request: Request) {
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const { prompt } = await request.json() as { prompt: string }
  if (!prompt?.trim()) return Response.json({ error: '缺少提示词' }, { status: 400 })

  const buffer = await generateImage(env, prompt)
  const suggestedKey = `ai-images/${new Date().toISOString().slice(0, 7)}/${generateId()}.jpg`
  const storage = await getStorageDriver(env)
  const { url } = await storage.upload(suggestedKey, buffer as ArrayBuffer, 'image/jpeg')

  return Response.json({ url })
}

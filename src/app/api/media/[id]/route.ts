import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getMediaById, deleteMedia } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getStorageDriver } from '@/lib/storage'


interface Params { params: Promise<{ id: string }> }

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params
  const { env } = getCloudflareContext()
  const user = await getCurrentUser(request, env)
  const authError = requireAdmin(user)
  if (authError) return authError

  const media = await getMediaById(env.DB, id)
  if (!media) return Response.json({ error: '媒体文件不存在' }, { status: 404 })

  const storage = await getStorageDriver(env)
  await Promise.all([
    storage.delete(media.r2_key),
    deleteMedia(env.DB, id),
  ])

  return Response.json({ ok: true })
}

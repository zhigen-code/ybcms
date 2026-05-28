import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getMediaList } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import { checkStorageReady } from '@/lib/storage'
import MediaLibraryClient from './_components/MediaLibraryClient'


export default async function MediaPage() {
  const { env } = getCloudflareContext()
  const [{ items, pagination }, settings] = await Promise.all([
    getMediaList(env.DB, 1, 60),
    getSiteSettings(env.DB),
  ])
  const { ready: storageReady } = checkStorageReady(env, settings)

  return (
    <div style={{ padding: '32px 40px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em', margin: 0 }}>
          媒体库
        </h1>
        <p style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>共 {pagination.total} 个文件</p>
      </div>
      <MediaLibraryClient initialItems={items} storageReady={storageReady} />
    </div>
  )
}

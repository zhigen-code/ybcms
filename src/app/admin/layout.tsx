export const dynamic = 'force-dynamic'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContentTypes } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import { checkStorageReady } from '@/lib/storage'
import AdminShell from './_components/AdminShell'

export type CustomTypeNavItem = { id: string; slug: string; name: string; icon: string }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let customTypes: CustomTypeNavItem[] = []
  let storageReady = true
  let storageWarning = ''
  try {
    const { env } = getCloudflareContext()
    const [all, settings] = await Promise.all([
      getContentTypes(env.DB),
      getSiteSettings(env.DB),
    ])
    customTypes = all
      .filter(t => !t.is_builtin)
      .map(t => ({ id: t.id, slug: t.slug, name: t.name, icon: t.icon || '📄' }))
    const status = checkStorageReady(env, settings)
    storageReady = status.ready
    storageWarning = status.reason || ''
  } catch {}
  return (
    <AdminShell customTypes={customTypes} storageReady={storageReady} storageWarning={storageWarning}>
      {children}
    </AdminShell>
  )
}

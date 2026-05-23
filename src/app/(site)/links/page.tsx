import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getLinks } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import { loadTheme } from '@/lib/theme-loader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '友情链接' }

export default async function LinksPage() {
  const { env } = getCloudflareContext()
  const [links, settings] = await Promise.all([
    getLinks(env.DB),
    getSiteSettings(env.DB),
  ])

  const themeId = settings['theme.active'] as string | undefined
  const theme = await loadTheme(themeId)
  const { Links } = theme

  return <Links links={links} settings={settings} />
}

export const dynamic = 'force-dynamic'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getLinks } from '@/lib/db'
import LinksClient from './_components/LinksClient'

export default async function LinksPage() {
  const { env } = getCloudflareContext()
  const links = await getLinks(env.DB, true)
  return <LinksClient initialLinks={links} />
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContentTypes } from '@/lib/db'
import ContentTypesClient from './_components/ContentTypesClient'

export default async function ContentTypesPage() {
  const { env } = getCloudflareContext()
  const types = await getContentTypes(env.DB)
  return <ContentTypesClient initialTypes={types} />
}

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getTagsWithCount } from '@/lib/db'
import TagsClient from './_components/TagsClient'

export default async function TagsPage() {
  const { env } = getCloudflareContext()
  const tags = await getTagsWithCount(env.DB)
  return <TagsClient initialTags={tags} />
}

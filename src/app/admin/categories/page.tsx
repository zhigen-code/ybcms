import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getCategories } from '@/lib/db'
import CategoriesClient from './_components/CategoriesClient'

export default async function CategoriesPage() {
  const { env } = getCloudflareContext()
  const [posts, pages] = await Promise.all([
    getCategories(env.DB, 'post'),
    getCategories(env.DB, 'page'),
  ])
  return <CategoriesClient initialPost={posts} initialPage={pages} />
}

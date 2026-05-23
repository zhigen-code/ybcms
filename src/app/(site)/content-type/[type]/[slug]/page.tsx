// This route is accessed via middleware rewrite from /:type/:slug
// e.g. /doctor/li-ming → /content-type/doctor/li-ming
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContentBySlugWithMeta, getRelatedPosts, getFormBySlug } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import { loadTheme } from '@/lib/theme-loader'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Form } from '@/types'
import { marked, type Tokens } from 'marked'
import { preprocessFormShortcodes, processFormEmbeds } from '@/lib/formEmbed'

function buildMarked() {
  const renderer = new marked.Renderer()
  renderer.code = ({ text, lang }: Tokens.Code) => {
    const langClass = lang ? `shj-lang-${lang}` : 'shj-lang-plain'
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre><code class="${langClass}">${escaped}</code></pre>`
  }
  return marked.use({ renderer })
}

interface Props { params: Promise<{ type: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, slug } = await params
  const { env } = getCloudflareContext()
  const content = await getContentBySlugWithMeta(env.DB, type, slug)
  if (!content) return {}
  return {
    title: content.meta_title || content.title,
    description: content.meta_description || content.excerpt || undefined,
    openGraph: content.og_image ? { images: [content.og_image] } : undefined,
  }
}

export default async function ContentTypeItemPage({ params }: Props) {
  const { type: rawType, slug: rawSlug } = await params
  const type = decodeURIComponent(rawType)
  const slug = decodeURIComponent(rawSlug)

  const { env } = getCloudflareContext()
  const [content, settings] = await Promise.all([
    getContentBySlugWithMeta(env.DB, type, slug),
    getSiteSettings(env.DB),
  ])
  if (!content || content.status !== 'published') notFound()

  buildMarked()
  const { markdown: preprocessed, slugs: preSlugs } = preprocessFormShortcodes(content.content ?? '')
  const rawHtml = preprocessed ? await marked.parse(preprocessed) : ''
  const { html: htmlContent, slugs: postSlugs } = processFormEmbeds(rawHtml)
  const formSlugs = [...new Set([...preSlugs, ...postSlugs])]

  const [related, formResults] = await Promise.all([
    getRelatedPosts(env.DB, content.id, 3),
    Promise.all(formSlugs.map(s => getFormBySlug(env.DB, s))),
  ])
  const embeddedForms = formResults.filter((f): f is Form => f !== null)

  const themeId = settings['theme.active'] as string | undefined
  const theme = await loadTheme(themeId)

  return (
    <theme.Post
      post={{ ...content, content: htmlContent }}
      settings={settings}
      related={related}
      embeddedForms={embeddedForms}
    />
  )
}

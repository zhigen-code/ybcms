import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContentBySlug, getFormBySlug, getPagesByParent, getContent } from '@/lib/db'
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

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { env } = getCloudflareContext()
  const page = await getContentBySlug(env.DB, 'page', slug)
  if (!page) return {}
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || page.excerpt || undefined,
    openGraph: page.og_image ? { images: [page.og_image] } : undefined,
  }
}

export default async function PagePage({ params }: Props) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { env } = getCloudflareContext()
  const [page, settings] = await Promise.all([
    getContentBySlug(env.DB, 'page', slug),
    getSiteSettings(env.DB),
  ])
  if (!page || page.status !== 'published') notFound()

  // Fetch parent page (for breadcrumb) and published child pages in parallel
  const [parentPage, allChildren] = await Promise.all([
    page.parent_id ? getContent(env.DB, page.parent_id) : Promise.resolve(null),
    getPagesByParent(env.DB, page.id),
  ])
  const childPages = allChildren.filter(c => c.status === 'published')

  buildMarked()
  const { markdown: preprocessed, slugs: preSlugs } = preprocessFormShortcodes(page.content ?? '')
  const rawHtml = preprocessed ? await marked.parse(preprocessed) : ''
  const { html: htmlContent, slugs: postSlugs } = processFormEmbeds(rawHtml)
  const formSlugs = [...new Set([...preSlugs, ...postSlugs])]
  const formResults = await Promise.all(formSlugs.map(s => getFormBySlug(env.DB, s)))
  const embeddedForms = formResults.filter((f): f is Form => f !== null)

  const themeId = settings['theme.active'] as string | undefined
  const theme = await loadTheme(themeId)
  const { Page } = theme

  return (
    <Page
      post={{ ...page, content: htmlContent }}
      settings={settings}
      embeddedForms={embeddedForms}
      parentPage={parentPage}
      childPages={childPages}
    />
  )
}

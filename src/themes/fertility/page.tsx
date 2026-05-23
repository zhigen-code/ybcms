import Link from 'next/link'
import type { ThemePageProps } from '@/types/theme'
import type { Form } from '@/types'
import InlineForm from '@/themes/default/components/InlineForm'

function ProseWithForms({ html, forms }: { html: string; forms: Form[] }) {
  const formMap = Object.fromEntries(forms.map(f => [f.slug, f]))
  const parts = html.split(/<div[^>]*data-form="([^"]+)"[^>]*><\/div>/g)
  if (parts.length === 1) {
    return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part.trim() ? <div key={i} className="prose" dangerouslySetInnerHTML={{ __html: part }} /> : null
        const form = formMap[part]
        return form ? <InlineForm key={i} form={form} /> : null
      })}
    </>
  )
}

export default function FertilityPage({ post, embeddedForms = [], parentPage, childPages = [] }: ThemePageProps) {
  return (
    <main style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .fpg-hero { background:linear-gradient(135deg,var(--color-bg-secondary) 0%,color-mix(in srgb,var(--color-primary) 6%,var(--color-bg)) 100%); border-bottom:1px solid var(--color-border); padding:clamp(2.5rem,6vw,4rem) 1.5rem; }
        .fpg-hero-inner { max-width:760px; margin:0 auto; }
        .fpg-breadcrumb { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:1.25rem; }
        .fpg-breadcrumb a { font-size:.82rem; color:var(--color-text-muted); text-decoration:none; }
        .fpg-breadcrumb a:hover { color:var(--color-primary); }
        .fpg-breadcrumb span { font-size:.82rem; color:var(--color-border); }
        .fpg-h1 { font-family:var(--font-heading); font-size:clamp(1.75rem,4vw,2.5rem); font-weight:800; color:var(--color-text); letter-spacing:-.035em; line-height:1.2; }
        .fpg-excerpt { font-size:1.05rem; color:var(--color-text-secondary); line-height:1.75; margin-top:.875rem; border-left:3px solid var(--color-primary); padding-left:1.25rem; }
        .fpg-body { max-width:760px; margin:3rem auto; padding:0 1.5rem 5rem; }
        .fpg-children { margin-top:3.5rem; padding-top:2.5rem; border-top:1px solid var(--color-border); }
        .fpg-children-title { font-family:var(--font-heading); font-size:1.1rem; font-weight:700; color:var(--color-text); margin-bottom:1.5rem; }
        .fpg-children-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
        @media(max-width:560px){ .fpg-children-grid{ grid-template-columns:1fr; } }
        .fpg-child-card { background:var(--color-bg-secondary); border:1px solid var(--color-border); border-radius:14px; overflow:hidden; text-decoration:none; transition:border-color .2s,box-shadow .2s; }
        .fpg-child-card:hover { border-color:var(--color-primary); box-shadow:0 2px 12px rgba(193,123,138,.1); }
        .fpg-child-cover { width:100%; height:120px; object-fit:cover; display:block; background:var(--color-bg-secondary); }
        .fpg-child-info { padding:1rem 1.125rem; }
        .fpg-child-title { font-size:.9375rem; font-weight:700; color:var(--color-text); line-height:1.4; margin-bottom:.25rem; }
        .fpg-child-excerpt { font-size:.82rem; color:var(--color-text-muted); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .fpg-back-link { font-size:.875rem; color:var(--color-text-muted); text-decoration:none; transition:color .15s; }
        .fpg-back-link:hover { color:var(--color-primary); }
      `}</style>

      {/* Hero */}
      <div className="fpg-hero">
        <div className="fpg-hero-inner">
          <nav className="fpg-breadcrumb">
            <Link href="/">首页</Link>
            {parentPage && (
              <>
                <span>/</span>
                <Link href={`/${parentPage.slug}`}>{parentPage.title}</Link>
              </>
            )}
            <span>/</span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '.82rem' }}>{post.title}</span>
          </nav>
          <h1 className="fpg-h1">{post.title}</h1>
          {post.excerpt && <p className="fpg-excerpt">{post.excerpt}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="fpg-body">
        {post.content && (
          <ProseWithForms html={post.content} forms={embeddedForms} />
        )}

        {childPages.length > 0 && (
          <div className="fpg-children">
            <div className="fpg-children-title">相关页面</div>
            <div className="fpg-children-grid">
              {childPages.map(child => (
                <Link key={child.id} href={`/${child.slug}`} className="fpg-child-card">
                  {child.cover_image && <img src={child.cover_image} alt={child.title} className="fpg-child-cover" />}
                  <div className="fpg-child-info">
                    <div className="fpg-child-title">{child.title}</div>
                    {child.excerpt && <div className="fpg-child-excerpt">{child.excerpt}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
          <Link href="/" className="fpg-back-link">← 返回首页</Link>
        </div>
      </div>
    </main>
  )
}

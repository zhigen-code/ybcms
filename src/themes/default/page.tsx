'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { ThemePageProps } from '@/types/theme'
import InlineForm from './components/InlineForm'
import type { Form } from '@/types'

function ProseWithForms({ html, forms, style }: { html: string; forms: Form[]; style?: React.CSSProperties }) {
  const formMap = Object.fromEntries(forms.map(f => [f.slug, f]))
  const parts = html.split(/<div[^>]*data-form="([^"]+)"[^>]*><\/div>/g)
  if (parts.length === 1) {
    return <div className="prose" style={style} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) {
          return part.trim() ? <div key={i} className="prose" style={style} dangerouslySetInnerHTML={{ __html: part }} /> : null
        }
        const form = formMap[part]
        return form ? <InlineForm key={i} form={form} /> : null
      })}
    </>
  )
}

export default function DefaultPage({ post, settings: _settings, embeddedForms = [], parentPage, childPages = [] }: ThemePageProps) {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/shj-github-dark.css'
    document.head.appendChild(link)
    import('@speed-highlight/core').then(({ highlightAll }) => { highlightAll() }).catch(() => {})
    return () => { link.remove() }
  }, [post.content])

  const backHref  = parentPage ? `/${parentPage.slug}` : '/'
  const backLabel = parentPage ? `← ${parentPage.title}` : '← 首页'

  return (
    <main>
      <style>{`
        .page-cover { width:100%; overflow:hidden; }
        .page-cover-img { width:100%; height:clamp(180px,30vw,380px); object-fit:cover; display:block; }
        .page-layout { max-width:820px; margin:0 auto; padding:3.5rem 1.5rem 6rem; }
        .page-child-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-top:2.5rem; }
        @media(max-width:600px){ .page-layout{padding:2rem 1.25rem 4rem} .page-child-grid{grid-template-columns:1fr 1fr} }
      `}</style>

      {post.cover_image && (
        <div className="page-cover">
          <img src={post.cover_image} alt={post.title} className="page-cover-img" />
        </div>
      )}

      <div className="page-layout">
        {/* Breadcrumb / back nav */}
        <nav style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {parentPage ? (
            <>
              <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>首页</Link>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>/</span>
              <Link href={`/${parentPage.slug}`} style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
              >
                {parentPage.title}
              </Link>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>/</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{post.title}</span>
            </>
          ) : (
            <Link href={backHref} style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
            >
              {backLabel}
            </Link>
          )}
        </nav>

        <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.75rem,4.5vw,2.75rem)',
            fontWeight: 900, lineHeight: 1.2,
            letterSpacing: '-0.03em', color: 'var(--color-text)',
          }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginTop: '1rem' }}>
              {post.excerpt}
            </p>
          )}
        </header>

        <ProseWithForms
          html={post.content ?? ''}
          forms={embeddedForms}
          style={{ lineHeight: 1.85, fontSize: '1.0625rem', color: 'var(--color-text)' }}
        />

        {/* Child pages */}
        {childPages.length > 0 && (
          <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              本节内容
            </p>
            <div className="page-child-grid">
              {childPages.map(child => (
                <Link key={child.id} href={`/${child.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '1rem 1.125rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-bg-secondary)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--color-primary)'
                      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--color-border)'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {child.cover_image && (
                      <div style={{ marginBottom: '0.75rem', borderRadius: 'calc(var(--radius) - 2px)', overflow: 'hidden' }}>
                        <img src={child.cover_image} alt={child.title} style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}
                    <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px', lineHeight: 1.35 }}>
                      {child.title}
                    </p>
                    {child.excerpt && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {child.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

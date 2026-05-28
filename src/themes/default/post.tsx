'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { Content, SiteSettings, Form } from '@/types'
import { formatDate, estimateReadingTime } from '@/lib/utils'
import TableOfContents from './components/TableOfContents'
import PostCard from './components/PostCard'
import ReadingProgress from './components/ReadingProgress'
import BackToTop from './components/BackToTop'
import InlineForm from './components/InlineForm'
import Breadcrumb from './components/Breadcrumb'

interface Props {
  post: Content
  settings: SiteSettings
  related?: Content[]
  embeddedForms?: Form[]
}

// Split HTML at form-embed placeholders and render interleaved with InlineForm components
function ProseWithForms({ html, forms, style }: { html: string; forms: Form[]; style?: React.CSSProperties }) {
  const formMap = Object.fromEntries(forms.map(f => [f.slug, f]))
  const parts = html.split(/<div[^>]*data-form="([^"]+)"[^>]*><\/div>/g)
  // parts: [htmlSegment, slug, htmlSegment, slug, ...]
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

export default function DefaultPost({ post, settings, related = [], embeddedForms = [] }: Props) {
  const showAiBadge = settings['site.showAiBadge'] === true
  const readTime = post.content ? estimateReadingTime(post.content) : 0
  const date = post.published_at ? formatDate(post.published_at) : null

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/shj-github-dark.css'
    document.head.appendChild(link)
    import('@speed-highlight/core').then(({ highlightAll }) => { highlightAll() }).catch(() => {})
    return () => { link.remove() }
  }, [post.content])

  return (
    <>
      <ReadingProgress />
      <main>
        <style>{`
          .post-cover { width:100%; overflow:hidden; }
          .post-cover-img { width:100%; height:clamp(220px,40vw,480px); object-fit:cover; display:block; }
          .post-layout { max-width:1100px; margin:0 auto; padding:3.5rem 1.5rem 6rem; display:grid; grid-template-columns:1fr 240px; gap:4rem; align-items:start; }
          .post-toc-col { position:sticky; top:88px; max-height:calc(100vh - 108px); overflow-y:auto; }
          .post-badges { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin-bottom:1.25rem; }
          .post-meta-bar { display:flex; flex-wrap:wrap; align-items:center; gap:0.75rem; padding:0.875rem 0; border-top:1px solid var(--color-border); border-bottom:1px solid var(--color-border); margin-bottom:0; }
          .post-tags { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1.25rem; }
          .tag-pill { font-size:0.75rem; padding:0.25rem 0.75rem; border-radius:99px; border:1px solid var(--color-border); color:var(--color-text-secondary); text-decoration:none; transition:all 0.15s; }
          .tag-pill:hover { border-color:var(--color-primary); color:var(--color-primary); background:color-mix(in srgb,var(--color-primary) 8%,transparent); }
          .author-card { display:flex; align-items:center; gap:1.25rem; padding:1.5rem; border-radius:var(--radius-lg); border:1px solid var(--color-border); background:var(--color-bg-secondary); margin-top:3rem; text-decoration:none; transition:box-shadow 0.2s, border-color 0.2s; }
          .author-card:hover { border-color:var(--color-primary); box-shadow:var(--shadow-md); }
          .author-avatar-lg { width:56px; height:56px; border-radius:50%; object-fit:cover; flex-shrink:0; }
          .author-avatar-fallback { width:56px; height:56px; border-radius:50%; background:var(--color-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.25rem; font-weight:800; font-family:var(--font-heading); flex-shrink:0; }
          .share-btn { display:inline-flex; align-items:center; padding:0.375rem 0.875rem; border-radius:7px; border:1px solid var(--color-border); font-size:0.8rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; background:none; cursor:pointer; transition:all 0.15s; }
          .share-btn:hover { border-color:var(--color-text-secondary); color:var(--color-text); background:var(--color-bg-secondary); }
          .related-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
          @media(max-width:1024px){ .post-toc-col{display:none!important} .post-layout{grid-template-columns:1fr} }
          @media(max-width:768px){ .related-grid{grid-template-columns:repeat(2,1fr)} }
          @media(max-width:600px){
            .post-layout{padding:1.75rem 1.25rem 4rem; gap:0}
            .related-grid{grid-template-columns:1fr}
            .author-card{flex-direction:column; text-align:center}
          }
        `}</style>

        {/* Cover image */}
        {post.cover_image && (
          <div className="post-cover">
            <img src={post.cover_image} alt={post.title} className="post-cover-img" />
          </div>
        )}

        <div className="post-layout">
          {/* ── Main article ── */}
          <article>
            {/* Breadcrumb */}
            <Breadcrumb
              style={{ marginBottom: '1.75rem' }}
              items={[
                { label: '首页', href: '/' },
                ...(post.categories?.length
                  ? [{ label: post.categories[0].name, href: `/category/${post.categories[0].slug}` }]
                  : []),
                { label: post.title },
              ]}
            />

            {/* Header */}
            <header style={{ marginBottom: '2.5rem' }}>
              {/* Badges */}
              <div className="post-badges">
                {post.categories?.map(cat => (
                  <Link key={cat.id} href={`/category/${cat.slug}`} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '99px', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', letterSpacing: '0.01em', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >{cat.name}</Link>
                ))}
                {showAiBadge && post.ai_generated && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>AI 生成</span>
                )}
              </div>

              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.75rem,4.5vw,2.75rem)', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', color: 'var(--color-text)', marginBottom: '1.125rem' }}>
                {post.title}
              </h1>

              {post.excerpt && (
                <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                  {post.excerpt}
                </p>
              )}

              {/* Meta bar */}
              <div className="post-meta-bar">
                {post.author && (
                  <Link href={`/author/${post.author.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text-secondary)', transition: 'color 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
                  >
                    {post.author.avatar
                      ? <img src={post.author.avatar} alt={post.author.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                      : <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>{post.author.name.slice(0, 1)}</span>
                    }
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{post.author.name}</span>
                  </Link>
                )}
                {date && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{date}</span>}
                {readTime > 0 && (
                  <>
                    <span style={{ color: 'var(--color-border)' }}>·</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{readTime} 分钟阅读</span>
                  </>
                )}
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="post-tags">
                  {post.tags.map(tag => (
                    <Link key={tag.id} href={`/tag/${tag.slug}`} className="tag-pill">#{tag.name}</Link>
                  ))}
                </div>
              )}
            </header>

            {/* Article body */}
            <ProseWithForms
              html={post.content ?? ''}
              forms={embeddedForms}
              style={{ lineHeight: 1.85, fontSize: '1.0625rem', color: 'var(--color-text)' }}
            />

            {/* Author card */}
            {post.author && (
              <Link href={`/author/${post.author.id}`} className="author-card">
                {post.author.avatar
                  ? <img src={post.author.avatar} alt={post.author.name} className="author-avatar-lg" />
                  : <div className="author-avatar-fallback">{post.author.name.slice(0, 1)}</div>
                }
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>作者</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{post.author.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>查看该作者的全部文章 →</p>
                </div>
              </Link>
            )}

            {/* Share */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>分享</span>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" className="share-btn">X / Twitter</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" className="share-btn">Facebook</a>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}) }} className="share-btn">复制链接</button>
            </div>

            {/* Related posts */}
            {related.length > 0 && (
              <section style={{ marginTop: '4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>相关文章</h2>
                  <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                </div>
                <div className="related-grid">
                  {related.map(p => <PostCard key={p.id} post={p} showAiBadge={showAiBadge} />)}
                </div>
              </section>
            )}

            {/* Footer nav */}
            <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
              <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', transition: 'color 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
              >← 返回首页</Link>
            </div>
          </article>

          {/* ── TOC sidebar ── */}
          <aside className="post-toc-col" style={{ paddingLeft: '1.5rem', borderLeft: '1px solid var(--color-border)' }}>
            <TableOfContents />
          </aside>
        </div>
      </main>
      <BackToTop />
    </>
  )
}

'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { Content, SiteSettings } from '@/types'
import { formatDate, estimateReadingTime } from '@/lib/utils'
import TableOfContents from './components/TableOfContents'
import PostCard from './components/PostCard'

interface Props {
  post: Content
  settings: SiteSettings
  related?: Content[]
}

export default function DefaultPost({ post, settings, related = [] }: Props) {
  void settings
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
    <main>
      <style>{`
        .post-cover { width:100%; overflow:hidden; max-height:480px; }
        .post-cover img { width:100%; height:480px; object-fit:cover; display:block; }
        .post-layout { max-width:1100px; margin:0 auto; padding:3.5rem 1.5rem 6rem; display:grid; grid-template-columns:1fr 240px; gap:4rem; align-items:start; }
        .post-toc-sidebar { position:sticky; top:88px; max-height:calc(100vh - 108px); overflow-y:auto; }
        .post-meta { display:flex; flex-wrap:wrap; align-items:center; gap:0.625rem; }
        .post-tags { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1.25rem; }
        .related-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
        @media(max-width:1024px){ .post-toc-sidebar{display:none!important} .post-layout{grid-template-columns:1fr} }
        @media(max-width:640px){
          .post-cover{max-height:220px!important}
          .post-cover img{height:220px!important}
          .post-layout{padding:2rem 1.25rem 4rem; gap:0}
          .related-grid{grid-template-columns:1fr}
        }
        @media(max-width:900px){ .related-grid{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      {/* Cover */}
      {post.cover_image && (
        <div className="post-cover">
          <img src={post.cover_image} alt={post.title} />
        </div>
      )}

      <div className="post-layout">
        {/* Main content */}
        <article>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: '2rem' }}>
            <Link href="/" style={{
              fontSize: '0.85rem', color: 'var(--color-text-secondary)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
            >← 返回</Link>
          </nav>

          {/* Article header */}
          <header style={{ marginBottom: '2.5rem' }}>
            {/* Badges row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
              {post.categories?.map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`} style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.75rem',
                  borderRadius: '99px', background: 'var(--color-primary)',
                  color: '#fff', letterSpacing: '0.01em', textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                >{cat.name}</Link>
              ))}
              {post.ai_generated && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                  borderRadius: '4px', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)', letterSpacing: '0.05em',
                }}>AI 生成</span>
              )}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)',
              fontWeight: 900, lineHeight: 1.2,
              letterSpacing: '-0.03em',
              color: 'var(--color-text)',
              marginBottom: '1.25rem',
            }}>{post.title}</h1>

            {post.excerpt && (
              <p style={{
                fontSize: '1.0625rem', color: 'var(--color-text-secondary)',
                lineHeight: 1.8, marginBottom: '1.5rem', fontWeight: 400,
              }}>{post.excerpt}</p>
            )}

            {/* Meta bar */}
            <div style={{
              padding: '1rem 0', borderTop: '1px solid var(--color-border)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.875rem',
            }}>
              {post.author && (
                <Link href={`/author/${post.author.id}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  textDecoration: 'none', color: 'var(--color-text-secondary)',
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
                >
                  {post.author.avatar
                    ? <img src={post.author.avatar} alt={post.author.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>{post.author.name.slice(0, 1)}</span>
                  }
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{post.author.name}</span>
                </Link>
              )}
              {date && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{date}</span>}
              {readTime > 0 && (
                <>
                  <span style={{ color: 'var(--color-border)', fontSize: '0.875rem' }}>·</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{readTime} 分钟阅读</span>
                </>
              )}
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="post-tags">
                {post.tags.map(tag => (
                  <Link key={tag.id} href={`/tag/${tag.slug}`} style={{
                    fontSize: '0.75rem', padding: '0.25rem 0.75rem',
                    borderRadius: '99px', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)', textDecoration: 'none',
                    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-primary)'; el.style.color = 'var(--color-primary)'; el.style.background = 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-border)'; el.style.color = 'var(--color-text-secondary)'; el.style.background = 'transparent' }}
                  >#{tag.name}</Link>
                ))}
              </div>
            )}
          </header>

          {/* Article body */}
          <div className="prose" style={{ lineHeight: 1.85, fontSize: '1.0625rem', color: 'var(--color-text)' }}
            dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
          />

          {/* Share */}
          <div style={{
            marginTop: '3rem', paddingTop: '1.75rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>分享</span>
            <ShareButton href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} label="X / Twitter" />
            <ShareButton href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} label="Facebook" />
            <CopyLinkButton />
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <section style={{ marginTop: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>相关文章</h2>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>
              <div className="related-grid">
                {related.map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </section>
          )}

          {/* Footer nav */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
            <Link href="/" style={{
              fontSize: '0.875rem', color: 'var(--color-text-secondary)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
            >← 返回首页</Link>
          </div>
        </article>

        {/* TOC sidebar */}
        <aside className="post-toc-sidebar" style={{
          paddingLeft: '1.5rem',
          borderLeft: '1px solid var(--color-border)',
        }}>
          <TableOfContents />
        </aside>
      </div>
    </main>
  )
}

function ShareButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.375rem 0.875rem', borderRadius: '7px',
      border: '1px solid var(--color-border)',
      fontSize: '0.8rem', fontWeight: 500,
      color: 'var(--color-text-secondary)', textDecoration: 'none',
      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-text-secondary)'; el.style.color = 'var(--color-text)'; el.style.background = 'var(--color-bg-secondary)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-border)'; el.style.color = 'var(--color-text-secondary)'; el.style.background = 'transparent' }}
    >{label}</a>
  )
}

function CopyLinkButton() {
  return (
    <button onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}) }} style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.375rem 0.875rem', borderRadius: '7px',
      border: '1px solid var(--color-border)',
      fontSize: '0.8rem', fontWeight: 500,
      color: 'var(--color-text-secondary)',
      background: 'none', cursor: 'pointer',
      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-text-secondary)'; el.style.color = 'var(--color-text)'; el.style.background = 'var(--color-bg-secondary)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--color-border)'; el.style.color = 'var(--color-text-secondary)'; el.style.background = 'transparent' }}
    >复制链接</button>
  )
}

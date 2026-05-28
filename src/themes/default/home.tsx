'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import type { Content, SiteSettings, Category, Tag } from '@/types'
import PostCard from './components/PostCard'
import PaginationNav from '@/components/PaginationNav'
import { formatDate } from '@/lib/utils'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props {
  posts: Content[]
  settings: SiteSettings
  categories?: Category[]
  categoryMap?: Record<string, Category>
  pagination?: Pagination
  tags?: (Tag & { count: number })[]
}

function extractBodyImages(html: string): string[] {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
  return matches.map(m => m[1]).filter(Boolean)
}

function HeroCarousel({ post }: { post: Content }) {
  const href = `/post/${post.slug}`
  const images: string[] = []
  if (post.cover_image) images.push(post.cover_image)
  if (post.content) images.push(...extractBodyImages(post.content))
  const slides = images.slice(0, 5)

  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  const goTo = useCallback((next: number) => {
    setFade(false)
    setTimeout(() => { setIdx(next); setFade(true) }, 300)
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => goTo((idx + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [idx, slides.length, goTo])

  return (
    <>
      {/* Slides */}
      {slides.length > 0
        ? <img
            key={slides[idx]}
            src={slides[idx]}
            alt=""
            className="home-hero-img"
            style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease' }}
          />
        : <div className="home-hero-fallback" />
      }
      <div className="home-hero-overlay" />

      <div className="home-hero-inner">
        {post.categories?.[0] && (
          <Link href={`/category/${post.categories[0].slug}`} className="hero-cat-badge">
            {post.categories[0].name}
          </Link>
        )}
        <Link href={href} className="hero-title-link">
          <h1>{post.title}</h1>
        </Link>
        {post.excerpt && <p className="home-hero-desc">{post.excerpt}</p>}
        <div className="hero-meta">
          {post.author && <span className="hero-meta-item">{post.author.name}</span>}
          {post.published_at && (
            <>
              {post.author && <span className="hero-meta-dot">·</span>}
              <span className="hero-meta-item">{formatDate(post.published_at)}</span>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`hero-dot${i === idx ? ' active' : ''}`} aria-label={`图片 ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function DefaultHome({ posts, settings, categories = [], categoryMap = {}, pagination, tags = [] }: Props) {
  const siteName = settings['site.name'] as string
  const siteDesc = settings['site.description'] as string | null
  const showAiBadge = settings['site.showAiBadge'] === true

  const featured = posts[0]
  const secondary = posts.slice(1, 3)
  const rest = posts.slice(3)
  const totalArticles = pagination?.total ?? posts.length

  return (
    <main>
      <style>{`
        /* Hero */
        .home-hero { position:relative; overflow:hidden; }
        .home-hero-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center; }
        .home-hero-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.82) 100%); }
        .home-hero-fallback { position:absolute; inset:0; background:linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); }
        .home-hero-inner { position:relative; z-index:2; min-height:clamp(480px,68vh,720px); max-width:var(--max-width); margin:0 auto; padding:clamp(3rem,8vw,5rem) 1.5rem clamp(2.5rem,6vw,4rem); display:flex; flex-direction:column; justify-content:flex-end; }
        .hero-cat-badge { display:inline-flex; align-items:center; padding:0.3rem 0.85rem; border-radius:99px; background:var(--color-primary); color:#fff; font-size:0.7rem; font-weight:700; letter-spacing:0.04em; text-decoration:none; margin-bottom:1rem; width:fit-content; }
        .home-hero h1 { font-family:var(--font-heading); font-size:clamp(1.9rem,5.5vw,3.5rem); font-weight:900; letter-spacing:-0.035em; line-height:1.12; color:#fff; margin-bottom:1rem; max-width:760px; text-shadow:0 2px 12px rgba(0,0,0,0.3); }
        .home-hero-desc { font-size:clamp(0.95rem,2vw,1.1rem); color:rgba(255,255,255,0.75); line-height:1.7; max-width:560px; margin-bottom:1.75rem; }
        .hero-meta { display:flex; flex-wrap:wrap; align-items:center; gap:0.75rem; margin-bottom:2rem; }
        .hero-meta-item { font-size:0.82rem; color:rgba(255,255,255,0.6); }
        .hero-meta-dot { color:rgba(255,255,255,0.3); }
        .hero-title-link { text-decoration:none; }
        .hero-title-link:hover h1 { opacity:0.85; }
        .hero-dots { display:flex; gap:6px; margin-top:1.25rem; }
        .hero-dot { width:6px; height:6px; border-radius:99px; border:none; background:rgba(255,255,255,0.35); cursor:pointer; padding:0; transition:background 0.2s, width 0.2s; }
        .hero-dot.active { background:#fff; width:20px; }
        /* Fallback hero (no image) */
        .home-hero-text-fallback h1 { color:#fff; }
        .home-hero-text-fallback .home-hero-desc { color:rgba(255,255,255,0.65); }
        .home-hero-stats { display:flex; flex-wrap:wrap; gap:2rem; margin-top:2rem; }
        .hero-stat { display:flex; flex-direction:column; gap:2px; }
        .hero-stat-num { font-size:1.75rem; font-weight:800; font-family:var(--font-heading); color:#fff; letter-spacing:-0.04em; line-height:1; }
        .hero-stat-label { font-size:0.72rem; color:rgba(255,255,255,0.5); font-weight:500; letter-spacing:0.04em; text-transform:uppercase; }
        /* Cat tabs */
        .cat-bar { border-bottom:1px solid var(--color-border); background:var(--color-bg); position:sticky; top:64px; z-index:10; }
        .cat-bar-inner { max-width:var(--max-width); margin:0 auto; padding:0 1.5rem; overflow-x:auto; display:flex; align-items:center; }
        .cat-link { display:inline-flex; align-items:center; padding:0.875rem 1rem; font-size:0.875rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; white-space:nowrap; flex-shrink:0; border-bottom:2px solid transparent; transition:color 0.15s, border-color 0.15s; }
        .cat-link:hover { color:var(--color-text); }
        .cat-link.active { color:var(--color-text); border-bottom-color:var(--color-primary); font-weight:600; }
        /* Content area */
        .home-content { max-width:var(--max-width); margin:0 auto; padding:clamp(2.5rem,5vw,4rem) 1.5rem clamp(4rem,8vw,6rem); }
        /* Grids */
        .home-secondary { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-top:1.25rem; }
        .home-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:1024px){ .home-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:640px){ .home-grid,.home-secondary{grid-template-columns:1fr; gap:1.25rem} }
        /* Section headings */
        .sec-head { display:flex; align-items:center; gap:1rem; margin-bottom:1.75rem; }
        .sec-head h2 { font-family:var(--font-heading); font-size:1.125rem; font-weight:800; color:var(--color-text); letter-spacing:-0.02em; white-space:nowrap; }
        .sec-head-line { flex:1; height:1px; background:var(--color-border); }
        .sec-head-meta { font-size:0.8rem; color:var(--color-text-muted); white-space:nowrap; }
        /* Tags cloud */
        .tags-section { border-top:1px solid var(--color-border); padding-top:3rem; margin-top:3.5rem; }
        .tag-chip { display:inline-flex; align-items:center; gap:0.375rem; padding:0.4rem 0.875rem; border-radius:99px; border:1px solid var(--color-border); background:var(--color-bg); font-size:0.875rem; color:var(--color-text-secondary); text-decoration:none; transition:all 0.15s; }
        .tag-chip:hover { border-color:var(--color-primary); color:var(--color-primary); background:color-mix(in srgb,var(--color-primary) 8%,var(--color-bg)); }
        /* Newsletter */
        .newsletter-section { margin-top:4rem; border-radius:var(--radius-lg); padding:clamp(2rem,5vw,3rem); background:var(--color-bg-secondary); border:1px solid var(--color-border); text-align:center; }
        /* Latest list items (mobile) */
        .home-list-item { display:flex; gap:1rem; padding:1.25rem 0; border-bottom:1px solid var(--color-border); text-decoration:none; color:inherit; }
        .home-list-thumb { width:80px; height:60px; border-radius:var(--radius); object-fit:cover; flex-shrink:0; background:var(--color-bg-secondary); }
      `}</style>

      {/* ── Hero ── */}
      <section className="home-hero">
        {featured
          ? <HeroCarousel post={featured} />
          : (
            <>
              <div className="home-hero-fallback" />
              <div className="home-hero-overlay" />
              <div className="home-hero-inner home-hero-text-fallback">
                <h1>{siteName}</h1>
                {siteDesc && <p className="home-hero-desc">{siteDesc}</p>}
                <div className="home-hero-stats">
                  {totalArticles > 0 && <div className="hero-stat"><span className="hero-stat-num">{totalArticles}</span><span className="hero-stat-label">篇文章</span></div>}
                  {categories.length > 0 && <div className="hero-stat"><span className="hero-stat-num">{categories.length}</span><span className="hero-stat-label">个分类</span></div>}
                </div>
              </div>
            </>
          )
        }
      </section>

      {/* ── Category tabs ── */}
      {categories.length > 0 && (
        <div className="cat-bar">
          <div className="cat-bar-inner hide-scrollbar">
            <Link href="/" className="cat-link active">全部</Link>
            {categories.map(cat => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="cat-link">{cat.name}</Link>
            ))}
          </div>
        </div>
      )}

      <div className="home-content">
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem' }}>✦</div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>暂无内容</p>
            <p style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>还没有发布任何文章</p>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.375rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)', textDecoration: 'none' }}>
              前往后台发布 →
            </Link>
          </div>
        ) : (
          <>
            {/* ── Secondary posts (2 cols) ── */}
            {secondary.length > 0 && (
              <section style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
                <div className="sec-head">
                  <h2>推荐阅读</h2>
                  <div className="sec-head-line" />
                </div>
                <div className="home-secondary">
                  {secondary.map(post => (
                    <PostCard key={post.id} post={post} category={categoryMap[post.categories?.[0]?.id ?? '']} showAiBadge={showAiBadge} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Rest posts grid ── */}
            {rest.length > 0 && (
              <section>
                <div className="sec-head">
                  <h2>最新文章</h2>
                  <div className="sec-head-line" />
                  <span className="sec-head-meta">共 {totalArticles} 篇</span>
                </div>
                <div className="home-grid">
                  {rest.map(post => (
                    <PostCard key={post.id} post={post} category={categoryMap[post.categories?.[0]?.id ?? '']} showAiBadge={showAiBadge} />
                  ))}
                </div>
              </section>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <PaginationNav
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                buildHref={p => p === 1 ? '/' : `/?page=${p}`}
              />
            )}

            {/* ── Tags cloud ── */}
            {tags.length > 0 && (
              <div className="tags-section">
                <div className="sec-head">
                  <h2>热门标签</h2>
                  <div className="sec-head-line" />
                  <Link href="/category" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>全部标签 →</Link>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tags.map(tag => (
                    <Link key={tag.id} href={`/tag/${tag.slug}`} className="tag-chip">
                      <span style={{ opacity: 0.45, fontSize: '0.8em' }}>#</span>
                      {tag.name}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '1px' }}>{tag.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

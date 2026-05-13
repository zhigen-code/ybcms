'use client'

import Link from 'next/link'
import type { Content, SiteSettings, Category } from '@/types'
import PostCard from './components/PostCard'
import PaginationNav from '@/components/PaginationNav'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props {
  posts: Content[]
  settings: SiteSettings
  categories?: Category[]
  categoryMap?: Record<string, Category>
  pagination?: Pagination
}

export default function DefaultHome({ posts, settings, categories = [], categoryMap = {}, pagination }: Props) {
  const siteName = settings['site.name'] as string
  const siteDesc = settings['site.description'] as string | null

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <main>
      <style>{`
        .home-hero { padding: clamp(3rem,8vw,5.5rem) 1.5rem clamp(2.5rem,6vw,4rem); text-align:center; background:var(--color-bg); border-bottom:1px solid var(--color-border); }
        .home-hero h1 { font-family:var(--font-heading); font-size:clamp(2rem,6vw,3.5rem); font-weight:900; letter-spacing:-0.04em; line-height:1.1; color:var(--color-text); margin-bottom:0.875rem; }
        .home-hero p { font-size:clamp(1rem,2.5vw,1.125rem); color:var(--color-text-secondary); line-height:1.75; max-width:560px; margin:0 auto; }
        .cat-bar { border-bottom:1px solid var(--color-border); background:var(--color-bg); position:sticky; top:64px; z-index:10; }
        .cat-bar-inner { max-width:var(--max-width); margin:0 auto; padding:0 1.5rem; overflow-x:auto; display:flex; align-items:center; }
        .cat-link { display:inline-flex; align-items:center; padding:0.875rem 1rem; font-size:0.875rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; white-space:nowrap; flex-shrink:0; border-bottom:2px solid transparent; transition:color 0.15s, border-color 0.15s; }
        .cat-link:hover { color:var(--color-text); }
        .cat-link.active { color:var(--color-text); border-bottom-color:var(--color-primary); font-weight:600; }
        .home-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:1024px){ .home-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:600px){ .home-grid { grid-template-columns:1fr; gap:1.25rem; } }
        .section-heading { display:flex; align-items:center; gap:1rem; margin-bottom:2rem; }
        .section-heading h2 { font-family:var(--font-heading); font-size:1.125rem; font-weight:800; color:var(--color-text); letter-spacing:-0.02em; white-space:nowrap; }
        .section-heading-line { flex:1; height:1px; background:var(--color-border); }
        .section-heading-count { font-size:0.8rem; color:var(--color-text-muted); white-space:nowrap; }
      `}</style>

      {/* Hero */}
      <section className="home-hero">
        <h1>{siteName}</h1>
        {siteDesc && <p>{siteDesc}</p>}
      </section>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="cat-bar">
          <div className="cat-bar-inner hide-scrollbar">
            <Link href="/" className="cat-link active">全部</Link>
            {categories.map(cat => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className="cat-link">
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'clamp(2.5rem,6vw,4rem) 1.5rem clamp(4rem,8vw,6rem)' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem', opacity: 0.3 }}>✦</div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>暂无内容</p>
            <p style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>还没有发布任何文章</p>
            <Link href="/admin" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.625rem 1.375rem', fontSize: '0.875rem', fontWeight: 500,
              border: '1px solid var(--color-border)', borderRadius: '8px',
              color: 'var(--color-text)', textDecoration: 'none',
            }}>前往后台发布</Link>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <section style={{ marginBottom: 'clamp(3rem,6vw,4.5rem)' }}>
                <PostCard post={featured} featured category={categoryMap[featured.categories?.[0]?.id ?? '']} />
              </section>
            )}

            {/* Recent posts grid */}
            {rest.length > 0 && (
              <section>
                <div className="section-heading">
                  <h2>最新文章</h2>
                  <div className="section-heading-line" />
                  <span className="section-heading-count">共 {pagination?.total ?? rest.length + 1} 篇</span>
                </div>
                <div className="home-grid">
                  {rest.map(post => (
                    <PostCard key={post.id} post={post} category={categoryMap[post.categories?.[0]?.id ?? '']} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {pagination && pagination.totalPages > 1 && (
          <PaginationNav
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            buildHref={p => p === 1 ? '/' : `/?page=${p}`}
          />
        )}
      </div>
    </main>
  )
}

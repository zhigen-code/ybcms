'use client'

import Link from 'next/link'
import type { Content, Category, Tag } from '@/types'
import PostCard from './PostCard'
import PaginationNav from '@/components/PaginationNav'
import Breadcrumb from './Breadcrumb'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props {
  title: string
  slug: string
  description?: string | null
  coverImage?: string | null
  posts: Content[]
  type: 'category' | 'tag'
  pagination: Pagination
  siblings?: Category[] | Tag[]
}

export default function ArchiveList({ title, slug, description, coverImage, posts, type, pagination, siblings = [] }: Props) {
  const prefix = type === 'tag' ? '#' : ''

  return (
    <main style={{ minHeight: '80vh' }}>
      <style>{`
        .archive-hero { position:relative; overflow:hidden; min-height:clamp(200px,28vh,320px); display:flex; flex-direction:column; justify-content:flex-end; }
        .archive-hero-bg-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center; }
        .archive-hero-bg-grad { position:absolute; inset:0; background:linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 55%, #000) 100%); }
        .archive-hero-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.38) 100%); }
        .archive-hero-inner { position:relative; z-index:2; max-width:var(--max-width); margin:0 auto; width:100%; padding:clamp(2rem,5vw,3.5rem) 1.5rem clamp(1.5rem,3vw,2.5rem); }
        .archive-label { font-size:0.68rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.55); margin-bottom:0.5rem; }
        .archive-title { font-family:var(--font-heading); font-size:clamp(1.75rem,5vw,3rem); font-weight:900; letter-spacing:-0.035em; color:#fff; line-height:1.12; text-shadow:0 2px 12px rgba(0,0,0,0.25); }
        .archive-desc { font-size:0.9375rem; color:rgba(255,255,255,0.65); line-height:1.75; max-width:520px; margin-top:0.625rem; }
        .archive-count { display:inline-flex; align-items:center; margin-top:0.875rem; font-size:0.78rem; color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); padding:0.2rem 0.75rem; border-radius:99px; }
        .archive-sibling-bar { background:var(--color-bg); border-bottom:1px solid var(--color-border); }
        .archive-sibling-bar-inner { max-width:var(--max-width); margin:0 auto; padding:0 1.5rem; overflow-x:auto; display:flex; align-items:center; }
        .sibling-link { display:inline-flex; align-items:center; padding:0.875rem 1rem; font-size:0.875rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; white-space:nowrap; flex-shrink:0; border-bottom:2px solid transparent; transition:color 0.15s, border-color 0.15s; }
        .sibling-link:hover { color:var(--color-text); }
        .sibling-link.active { color:var(--color-text); border-bottom-color:var(--color-primary); font-weight:600; }
        .archive-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:1024px){ .archive-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:600px){ .archive-grid{grid-template-columns:1fr; gap:1.25rem} }
      `}</style>

      {/* Hero */}
      <div className="archive-hero">
        {coverImage
          ? <img src={coverImage} alt={title} className="archive-hero-bg-img" />
          : <div className="archive-hero-bg-grad" />
        }
        <div className="archive-hero-overlay" />
        <div className="archive-hero-inner">
          <Breadcrumb
            dark
            style={{ marginBottom: '0.875rem' }}
            items={[
              { label: '首页', href: '/' },
              { label: type === 'category' ? '分类' : '标签' },
              { label: title },
            ]}
          />
          <p className="archive-label">{type === 'category' ? '分类' : '标签'}</p>
          <h1 className="archive-title">{prefix}{title}</h1>
          {description && <p className="archive-desc">{description}</p>}
          <span className="archive-count">{pagination.total} 篇文章</span>
        </div>
      </div>

      {/* Sibling tabs */}
      {siblings.length > 0 && (
        <div className="archive-sibling-bar">
          <div className="archive-sibling-bar-inner hide-scrollbar">
            {siblings.map(s => {
              const active = s.slug === slug
              const href = type === 'category' ? `/category/${s.slug}` : `/tag/${s.slug}`
              return (
                <Link key={s.id} href={href} className={`sibling-link${active ? ' active' : ''}`}>
                  {type === 'tag' ? '#' : ''}{s.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'clamp(2.5rem,6vw,4rem) 1.5rem clamp(4rem,8vw,6rem)' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-secondary)' }}>
            <p style={{ fontSize: '0.875rem' }}>暂无文章</p>
          </div>
        ) : (
          <>
            <div className="archive-grid">
              {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
            <PaginationNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
              buildHref={p => {
                const base = type === 'category' ? `/category/${slug}` : `/tag/${slug}`
                return p === 1 ? base : `${base}?page=${p}`
              }}
            />
          </>
        )}
      </div>
    </main>
  )
}

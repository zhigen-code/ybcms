'use client'

import Link from 'next/link'
import type { Content, Category, Tag } from '@/types'
import PostCard from './PostCard'
import PaginationNav from '@/components/PaginationNav'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props {
  title: string
  slug: string
  description?: string | null
  posts: Content[]
  type: 'category' | 'tag'
  pagination: Pagination
  siblings?: Category[] | Tag[]
}

export default function ArchiveList({ title, slug, description, posts, type, pagination, siblings = [] }: Props) {
  const prefix = type === 'tag' ? '#' : ''

  return (
    <main style={{ minHeight: '80vh' }}>
      <style>{`
        .archive-header { border-bottom:1px solid var(--color-border); background:var(--color-bg); }
        .archive-header-inner { max-width:var(--max-width); margin:0 auto; padding:clamp(2.5rem,6vw,4rem) 1.5rem 0; }
        .archive-label { font-size:0.7rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-secondary); margin-bottom:0.5rem; }
        .archive-title { font-family:var(--font-heading); font-size:clamp(1.75rem,5vw,2.75rem); font-weight:900; letter-spacing:-0.03em; color:var(--color-text); line-height:1.15; }
        .archive-desc { font-size:0.9375rem; color:var(--color-text-secondary); line-height:1.75; max-width:560px; margin-top:0.75rem; }
        .archive-count { font-size:0.8rem; color:var(--color-text-muted); margin-top:0.5rem; }
        .archive-sibling-bar { max-width:var(--max-width); margin:0 auto; padding:0 1.5rem; overflow-x:auto; display:flex; align-items:center; }
        .sibling-link { display:inline-flex; align-items:center; padding:0.875rem 1rem; font-size:0.875rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; white-space:nowrap; flex-shrink:0; border-bottom:2px solid transparent; transition:color 0.15s, border-color 0.15s; }
        .sibling-link:hover { color:var(--color-text); }
        .sibling-link.active { color:var(--color-text); border-bottom-color:var(--color-primary); font-weight:600; }
        .archive-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:1024px){ .archive-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:600px){ .archive-grid{grid-template-columns:1fr; gap:1.25rem} }
      `}</style>

      <div className="archive-header">
        <div className="archive-header-inner">
          <p className="archive-label">{type === 'category' ? '分类' : '标签'}</p>
          <h1 className="archive-title">{prefix}{title}</h1>
          {description && <p className="archive-desc">{description}</p>}
          <p className="archive-count">{pagination.total} 篇文章</p>
        </div>

        {siblings.length > 0 && (
          <div className="archive-sibling-bar hide-scrollbar">
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
        )}
      </div>

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

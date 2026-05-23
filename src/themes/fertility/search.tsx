'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ThemeSearchProps } from '@/types/theme'
import { formatDate } from '@/lib/utils'
import PaginationNav from '@/components/PaginationNav'

export default function FertilitySearch({ query, posts, pagination, categoryMap }: ThemeSearchProps) {
  const router = useRouter()
  const [q, setQ] = useState(query)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <main style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .fs-hero { background:var(--color-bg-secondary); border-bottom:1px solid var(--color-border); padding:3rem 1.5rem; }
        .fs-hero-inner { max-width:680px; margin:0 auto; text-align:center; }
        .fs-hero h1 { font-family:var(--font-heading); font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:var(--color-text); letter-spacing:-.03em; margin-bottom:1.5rem; }
        .fs-form { display:flex; gap:.75rem; max-width:520px; margin:0 auto; }
        .fs-input { flex:1; padding:12px 18px; font-size:1rem; border:1.5px solid var(--color-border); border-radius:99px; outline:none; background:var(--color-bg); color:var(--color-text); font-family:inherit; transition:border-color .15s; }
        .fs-input:focus { border-color:var(--color-primary); }
        .fs-submit { padding:12px 24px; background:var(--color-primary); color:#fff; border:none; border-radius:99px; font-size:.9rem; font-weight:600; cursor:pointer; transition:opacity .15s; font-family:inherit; flex-shrink:0; }
        .fs-submit:hover { opacity:.88; }
        .fs-body { max-width:760px; margin:0 auto; padding:2.5rem 1.5rem 5rem; }
        .fs-meta { font-size:.875rem; color:var(--color-text-muted); margin-bottom:1.75rem; }
        .fs-meta strong { color:var(--color-primary); }
        .fs-item { display:flex; gap:1.25rem; padding:1.25rem 0; border-bottom:1px solid var(--color-border); text-decoration:none; align-items:flex-start; }
        .fs-item:last-child { border-bottom:none; }
        .fs-thumb { width:80px; height:60px; border-radius:10px; object-fit:cover; flex-shrink:0; background:var(--color-bg-secondary); display:block; }
        .fs-thumb-ph { width:80px; height:60px; border-radius:10px; background:color-mix(in srgb,var(--color-primary) 10%,var(--color-bg-secondary)); display:flex; align-items:center; justify-content:center; font-size:1.5rem; flex-shrink:0; }
        .fs-info { flex:1; min-width:0; }
        .fs-cat { font-size:.72rem; font-weight:700; color:var(--color-primary); letter-spacing:.04em; margin-bottom:.3rem; }
        .fs-title { font-size:.9375rem; font-weight:600; color:var(--color-text); line-height:1.45; transition:color .15s; margin-bottom:.3rem; }
        .fs-item:hover .fs-title { color:var(--color-primary); }
        .fs-excerpt { font-size:.8rem; color:var(--color-text-muted); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .fs-date { font-size:.75rem; color:var(--color-text-muted); margin-top:.25rem; }
        .fs-empty { text-align:center; padding:4rem 0; color:var(--color-text-muted); }
      `}</style>

      <div className="fs-hero">
        <div className="fs-hero-inner">
          <h1>搜索</h1>
          <form className="fs-form" onSubmit={handleSubmit}>
            <input
              className="fs-input"
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="搜索医疗资讯、医生、服务…"
              autoFocus
            />
            <button className="fs-submit" type="submit">搜索</button>
          </form>
        </div>
      </div>

      <div className="fs-body">
        {query && (
          <p className="fs-meta">
            {posts.length > 0
              ? <>共找到 <strong>{pagination.total}</strong> 条与 "<strong>{query}</strong>" 相关的内容</>
              : <>没有找到与 "<strong>{query}</strong>" 相关的内容</>
            }
          </p>
        )}

        {posts.length === 0 ? (
          <div className="fs-empty">
            <p style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔍</p>
            <p>{query ? '换个关键词试试' : '输入关键词开始搜索'}</p>
          </div>
        ) : (
          <>
            {posts.map(post => {
              const cat = post.categories?.[0] ? categoryMap[post.categories[0].id] : null
              return (
                <Link key={post.id} href={`/post/${post.slug}`} className="fs-item">
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title} className="fs-thumb" />
                    : <div className="fs-thumb-ph">📰</div>
                  }
                  <div className="fs-info">
                    {cat && <div className="fs-cat">{cat.name}</div>}
                    <div className="fs-title">{post.title}</div>
                    {post.excerpt && <div className="fs-excerpt">{post.excerpt}</div>}
                    <div className="fs-date">{post.published_at ? formatDate(post.published_at) : ''}</div>
                  </div>
                </Link>
              )
            })}
            <div style={{ marginTop: '2rem' }}>
              <PaginationNav
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                buildHref={p => p === 1 ? `/search?q=${encodeURIComponent(query)}` : `/search?q=${encodeURIComponent(query)}&page=${p}`}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

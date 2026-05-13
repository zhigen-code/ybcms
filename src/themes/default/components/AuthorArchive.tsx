'use client'

import Link from 'next/link'
import type { Content, User } from '@/types'
import PostCard from './PostCard'
import PaginationNav from '@/components/PaginationNav'

interface Pagination { page: number; totalPages: number; total: number; pageSize: number }

interface Props { author: User; posts: Content[]; pagination: Pagination }

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员', editor: '编辑', author: '作者', subscriber: '订阅者',
}

export default function AuthorArchive({ author, posts, pagination }: Props) {
  const initials = author.name.slice(0, 2).toUpperCase()

  return (
    <main style={{ minHeight: '80vh' }}>
      <style>{`
        .author-header { border-bottom:1px solid var(--color-border); background:var(--color-bg); padding:clamp(2.5rem,6vw,4rem) 1.5rem 2.5rem; }
        .author-header-inner { max-width:var(--max-width); margin:0 auto; }
        .author-avatar { width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid var(--color-border); flex-shrink:0; }
        .author-avatar-fallback { width:72px; height:72px; border-radius:50%; background:var(--color-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; font-family:var(--font-heading); flex-shrink:0; }
        .author-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:1024px){ .author-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:600px){ .author-grid{grid-template-columns:1fr; gap:1.25rem} }
      `}</style>

      <div className="author-header">
        <div className="author-header-inner">
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.85rem', color: 'var(--color-text-secondary)',
            textDecoration: 'none', marginBottom: '2rem',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
          >← 返回首页</Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {author.avatar
              ? <img src={author.avatar} alt={author.name} className="author-avatar" />
              : <div className="author-avatar-fallback">{initials}</div>
            }
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>作者</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--color-text)', lineHeight: 1.15 }}>{author.name}</h1>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.625rem', borderRadius: '99px', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>{ROLE_LABEL[author.role] ?? author.role}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>共 {pagination.total} 篇文章</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: 'clamp(2.5rem,6vw,4rem) 1.5rem clamp(4rem,8vw,6rem)' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-secondary)' }}>
            <p style={{ fontSize: '0.875rem' }}>该作者暂无已发布文章</p>
          </div>
        ) : (
          <>
            <div className="author-grid">
              {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
            <PaginationNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
              buildHref={p => p === 1 ? `/author/${author.id}` : `/author/${author.id}?page=${p}`}
            />
          </>
        )}
      </div>
    </main>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import type { ThemeSearchProps } from '@/types/theme'
import PostCard from './components/PostCard'
import PaginationNav from '@/components/PaginationNav'
import Breadcrumb from './components/Breadcrumb'

function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValueState] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', maxWidth: '560px' }}>
      <input
        type="search" value={value}
        onChange={e => setValueState(e.target.value)}
        placeholder="输入关键词搜索文章…"
        autoFocus
        style={{
          flex: 1, height: '44px', padding: '0 1rem',
          fontSize: '0.9375rem',
          border: '1.5px solid var(--color-border)', borderRadius: '10px',
          background: 'var(--color-bg)', color: 'var(--color-text)',
          outline: 'none', transition: 'border-color 0.15s',
        }}
        onFocus={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
        onBlur={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
      />
      <button type="submit" style={{
        height: '44px', padding: '0 1.25rem', borderRadius: '10px', border: 'none',
        background: 'var(--color-text)', color: '#fff',
        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>搜索</button>
    </form>
  )
}

export default function DefaultSearch({ query, posts, pagination, categoryMap }: ThemeSearchProps) {
  return (
    <main style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <Breadcrumb
          style={{ marginBottom: '1.25rem' }}
          items={[
            { label: '首页', href: '/' },
            { label: '搜索' },
          ]}
        />
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.5rem,4vw,2rem)',
          fontWeight: 900, letterSpacing: '-0.03em',
          color: 'var(--color-text)', marginBottom: '1.5rem',
        }}>搜索</h1>
        <SearchBox defaultValue={query} />
      </div>

      {query && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {pagination.total > 0
                ? <>找到 <strong style={{ color: 'var(--color-text)' }}>{pagination.total}</strong> 篇与 <strong style={{ color: 'var(--color-text)' }}>&ldquo;{query}&rdquo;</strong> 相关的文章</>
                : <>没有找到与 <strong style={{ color: 'var(--color-text)' }}>&ldquo;{query}&rdquo;</strong> 相关的文章</>
              }
            </p>
          </div>

          {posts.length > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                gap: '1.5rem', marginBottom: '3rem',
              }}>
                {posts.map(post => (
                  <PostCard key={post.id} post={post} category={categoryMap[post.categories?.[0]?.id ?? '']} />
                ))}
              </div>
              <PaginationNav
                page={pagination.page} totalPages={pagination.totalPages}
                total={pagination.total} pageSize={pagination.pageSize}
                buildHref={p => `/search?q=${encodeURIComponent(query)}&page=${p}`}
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-secondary)' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>未找到相关内容</p>
              <p style={{ fontSize: '0.875rem' }}>换个关键词试试吧</p>
            </div>
          )}
        </>
      )}

      {!query && (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>输入关键词开始搜索</p>
          <p style={{ fontSize: '0.875rem' }}>支持标题、摘要和正文全文检索</p>
        </div>
      )}
    </main>
  )
}

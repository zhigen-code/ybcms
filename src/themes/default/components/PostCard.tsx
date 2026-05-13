'use client'

import Link from 'next/link'
import type { Content, Category } from '@/types'
import { formatDate, estimateReadingTime } from '@/lib/utils'

interface Props {
  post: Content
  featured?: boolean
  category?: Category
}

export default function PostCard({ post, featured = false, category }: Props) {
  const href = post.type === 'page' ? `/${post.slug}` : `/post/${post.slug}`
  const readTime = post.content ? estimateReadingTime(post.content) : 0
  const date = post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)
  const cat = category ?? post.categories?.[0]

  if (featured) {
    return (
      <>
        <style>{`
          .featured-card { display:grid; grid-template-columns:1fr 45%; border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--color-border); background:var(--color-bg); box-shadow:var(--shadow-sm); transition:box-shadow 0.25s; }
          .featured-card:hover { box-shadow: var(--shadow-lg); }
          .featured-card-img { aspect-ratio:16/9; overflow:hidden; order:2; }
          .featured-card-body { padding:2.5rem; display:flex; flex-direction:column; justify-content:center; order:1; }
          @media(max-width:768px){
            .featured-card { grid-template-columns:1fr; }
            .featured-card-img { aspect-ratio:16/7; order:1; }
            .featured-card-body { padding:1.5rem; order:2; }
          }
        `}</style>
        <article className="featured-card">
          {post.cover_image && (
            <Link href={href} className="featured-card-img" style={{ display: 'block' }}>
              <img
                src={post.cover_image} alt={post.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.04)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
              />
            </Link>
          )}
          <div className="featured-card-body">
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--color-primary)',
              }}>精选</span>
              {cat && (
                <Link href={`/category/${cat.slug}`} style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.625rem',
                  borderRadius: '99px', background: 'var(--color-primary)',
                  color: '#fff', textDecoration: 'none',
                }}>{cat.name}</Link>
              )}
              {post.ai_generated && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                  borderRadius: '4px', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}>AI</span>
              )}
            </div>

            <Link href={href} style={{ textDecoration: 'none' }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.35rem, 2.5vw, 1.875rem)',
                fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.025em',
                color: 'var(--color-text)', marginBottom: '0.875rem',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-primary)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              >{post.title}</h2>
            </Link>

            {post.excerpt && (
              <p style={{
                color: 'var(--color-text-secondary)', lineHeight: 1.75,
                fontSize: '0.9375rem', marginBottom: '1.5rem',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>{post.excerpt}</p>
            )}

            <div style={{
              display: 'flex', gap: '0.75rem', fontSize: '0.8rem',
              color: 'var(--color-text-muted)', alignItems: 'center',
            }}>
              <span>{date}</span>
              {readTime > 0 && <><span style={{ opacity: 0.4 }}>·</span><span>{readTime} 分钟阅读</span></>}
            </div>
          </div>
        </article>
      </>
    )
  }

  return (
    <article style={{
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      border: '1px solid var(--color-border)',
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.25s, transform 0.25s',
      boxShadow: 'var(--shadow-sm)',
    }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-md)'; el.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-sm)'; el.style.transform = 'translateY(0)' }}
    >
      {/* Image */}
      <Link href={href} style={{ display: 'block', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
        {post.cover_image ? (
          <>
            <img
              src={post.cover_image} alt={post.title}
              style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.05)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
            />
            {/* Category overlay badge */}
            {cat && (
              <span style={{
                position: 'absolute', bottom: '0.75rem', left: '0.75rem',
                fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                borderRadius: '5px', background: 'var(--color-primary)',
                color: '#fff', letterSpacing: '0.02em', pointerEvents: 'none',
              }}>{cat.name}</span>
            )}
          </>
        ) : (
          <div style={{
            width: '100%', aspectRatio: '3/2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, var(--color-bg-secondary)), var(--color-bg-secondary))`,
            position: 'relative',
          }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.25, fontFamily: 'var(--font-heading)', fontWeight: 900 }}>
              {post.title.slice(0, 1)}
            </span>
            {cat && (
              <span style={{
                position: 'absolute', bottom: '0.75rem', left: '0.75rem',
                fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                borderRadius: '5px', background: 'var(--color-primary)',
                color: '#fff', letterSpacing: '0.02em',
              }}>{cat.name}</span>
            )}
          </div>
        )}
      </Link>

      {/* Content */}
      <div style={{ padding: '1.25rem 1.375rem 1.375rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {post.ai_generated && (
          <span style={{
            display: 'inline-block', alignSelf: 'flex-start',
            fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.5rem',
            borderRadius: '4px', border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)', letterSpacing: '0.05em',
          }}>AI</span>
        )}

        <Link href={href} style={{ textDecoration: 'none', flex: 1 }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700,
            lineHeight: 1.45, letterSpacing: '-0.01em', color: 'var(--color-text)',
            transition: 'color 0.15s',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-primary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
          >{post.title}</h3>

          {post.excerpt && (
            <p style={{
              color: 'var(--color-text-secondary)', lineHeight: 1.65, fontSize: '0.85rem',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden', marginTop: '0.5rem',
            }}>{post.excerpt}</p>
          )}
        </Link>

        <div style={{
          display: 'flex', gap: '0.625rem', fontSize: '0.75rem',
          color: 'var(--color-text-muted)', alignItems: 'center',
          marginTop: '0.25rem', paddingTop: '0.875rem',
          borderTop: '1px solid var(--color-border)',
        }}>
          <span>{date}</span>
          {readTime > 0 && <><span style={{ opacity: 0.5 }}>·</span><span>{readTime} 分钟</span></>}
        </div>
      </div>
    </article>
  )
}

'use client'

import Link from 'next/link'
import type { Link as FriendlyLink, SiteSettings } from '@/types'
import { ExternalLinkIcon, GlobeIcon } from '@/components/icons'
import Breadcrumb from './components/Breadcrumb'

interface Props {
  links: FriendlyLink[]
  settings: SiteSettings
}

export default function DefaultLinks({ links, settings: _settings }: Props) {
  return (
    <main style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
      <style>{`
        .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; margin-top: 2rem; }
        .link-card { display: flex; align-items: flex-start; gap: 12px; padding: 1rem 1.125rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg-secondary); text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .link-card:hover { border-color: var(--color-primary); box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
        @media(max-width: 600px) { .links-grid { grid-template-columns: 1fr 1fr; } }
        @media(max-width: 400px) { .links-grid { grid-template-columns: 1fr; } }
      `}</style>

      <Breadcrumb style={{ marginBottom: '1.5rem' }} items={[{ label: '首页', href: '/' }, { label: '友情链接' }]} />

      <header style={{ marginBottom: '0.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--color-text)' }}>
          友情链接
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          共 {links.length} 个站点
        </p>
      </header>

      {links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔗</p>
          <p style={{ fontSize: '0.9rem' }}>暂无友情链接</p>
        </div>
      ) : (
        <div className="links-grid">
          {links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="link-card">
              {link.logo
                ? <img src={link.logo} alt={link.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GlobeIcon size={16} />
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link.name}
                  </span>
                  <span style={{ flexShrink: 0, color: 'var(--color-text-muted)', lineHeight: 0 }}><ExternalLinkIcon size={11} /></span>
                </div>
                {link.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '3px', lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {link.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
        <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
        >← 返回首页</Link>
      </div>
    </main>
  )
}

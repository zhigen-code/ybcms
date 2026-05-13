'use client'

import Link from 'next/link'
import type { SiteSettings, NavItem } from '@/types'

interface Props { settings: Partial<SiteSettings> }

export default function Footer({ settings }: Props) {
  const siteName = (settings['site.name'] as string) || 'AI CMS'
  const siteDesc = settings['site.description'] as string | null
  const navItems = (settings['nav.footer'] as NavItem[]) || (settings['nav.main'] as NavItem[]) || []
  const year = new Date().getFullYear()

  return (
    <footer style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
      <style>{`
        .footer-body { max-width:var(--max-width); margin:0 auto; padding:3rem 1.5rem 2rem; display:grid; grid-template-columns:1fr auto; gap:3rem; align-items:start; }
        .footer-nav { display:flex; flex-direction:column; gap:0.625rem; align-items:flex-end; }
        .footer-bottom { max-width:var(--max-width); margin:0 auto; padding:1.25rem 1.5rem; border-top:1px solid var(--color-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; }
        @media(max-width:640px){
          .footer-body { grid-template-columns:1fr; gap:2rem; }
          .footer-nav { align-items:flex-start; flex-direction:row; flex-wrap:wrap; gap:0.5rem 1.25rem; }
        }
      `}</style>
      <div className="footer-body">
        <div>
          <Link href="/" style={{
            fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem',
            color: 'var(--color-text)', textDecoration: 'none',
            letterSpacing: '-0.03em', display: 'block', marginBottom: '0.625rem',
          }}>{siteName}</Link>
          {siteDesc && (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.75, maxWidth: '320px' }}>
              {siteDesc}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Link href="/search" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)')}
            >搜索</Link>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <Link href="/admin" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)')}
            >管理后台</Link>
          </div>
        </div>

        {navItems.length > 0 && (
          <nav className="footer-nav">
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>导航</p>
            {navItems.map(item => (
              <Link key={item.id} href={item.url} target={item.target} style={{
                fontSize: '0.875rem', color: 'var(--color-text-secondary)',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)')}
              >{item.label}</Link>
            ))}
          </nav>
        )}
      </div>

      <div className="footer-bottom">
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          © {year} {siteName}. 保留所有权利。
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Powered by <Link href="/admin" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>AI CMS</Link>
        </p>
      </div>
    </footer>
  )
}

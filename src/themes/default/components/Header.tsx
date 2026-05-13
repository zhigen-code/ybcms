'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SiteSettings, NavItem } from '@/types'
import { MenuIcon, XIcon, SearchIcon } from '@/components/icons'

interface Props { settings: Partial<SiteSettings> }

export default function Header({ settings }: Props) {
  const siteName = (settings['site.name'] as string) || 'AI CMS'
  const logo = settings['site.logo'] as string | null
  const navItems = (settings['nav.main'] as NavItem[]) || []
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    fn()
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <style>{`
        .site-header {
          position: sticky; top: 0; z-index: 50;
          transition: background 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .site-header.scrolled {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-bottom: 1px solid var(--color-border);
          box-shadow: 0 1px 0 rgba(15,23,42,0.04);
        }
        @media(prefers-color-scheme:dark){
          .site-header.scrolled { background: rgba(15,23,42,0.92); }
        }
        .site-header:not(.scrolled) {
          background: transparent;
          border-bottom: 1px solid transparent;
        }
        .nav-link {
          padding: 0.375rem 0.75rem; border-radius: 6px;
          font-size: 0.875rem; font-weight: 500;
          color: var(--color-text-secondary); text-decoration: none;
          transition: color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--color-text); background: var(--color-bg-secondary); }
        .header-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px;
          color: var(--color-text-secondary); text-decoration: none;
          transition: color 0.15s, background 0.15s; border: none;
          background: none; cursor: pointer;
        }
        .header-icon-btn:hover { color: var(--color-text); background: var(--color-bg-secondary); }
        .header-admin-btn {
          font-size: 0.8rem; font-weight: 500;
          color: var(--color-text-secondary); text-decoration: none;
          padding: 0.375rem 0.875rem;
          border: 1px solid var(--color-border); border-radius: 7px;
          transition: all 0.15s; white-space: nowrap;
        }
        .header-admin-btn:hover { color: var(--color-text); border-color: var(--color-text-secondary); background: var(--color-bg-secondary); }
        @media(max-width:767px){
          .header-desktop-nav, .header-admin-btn { display: none !important; }
        }
        @media(min-width:768px){
          .header-hamburger { display: none !important; }
        }
      `}</style>

      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          padding: '0 1.5rem',
          display: 'flex', alignItems: 'center',
          height: '64px', gap: '1rem',
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, marginRight: '0.5rem' }}>
            {logo
              ? <img src={logo} alt={siteName} style={{ height: '28px', width: 'auto' }} />
              : <span style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 800,
                  fontSize: '1.2rem', color: 'var(--color-text)',
                  letterSpacing: '-0.04em',
                }}>{siteName}</span>
            }
          </Link>

          {/* Desktop nav */}
          {navItems.length > 0 && (
            <nav className="header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
              {navItems.map(item => (
                <Link key={item.id} href={item.url} target={item.target} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div style={{ flex: 1 }} />

          {/* Search */}
          <Link href="/search" className="header-icon-btn" title="搜索">
            <SearchIcon size={18} />
          </Link>

          {/* Admin (desktop) */}
          <Link href="/admin" className="header-admin-btn">后台</Link>

          {/* Hamburger (mobile) */}
          <button onClick={() => setOpen(o => !o)} className="header-icon-btn header-hamburger" aria-label="菜单">
            {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'var(--color-bg)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            height: '64px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 1.5rem',
            borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          }}>
            <Link href="/" onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
              {logo
                ? <img src={logo} alt={siteName} style={{ height: '28px', width: 'auto' }} />
                : <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-text)', letterSpacing: '-0.04em' }}>{siteName}</span>
              }
            </Link>
            <button onClick={() => setOpen(false)} className="header-icon-btn">
              <XIcon size={20} />
            </button>
          </div>
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem 3rem' }}>
            <Link href="/" onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', padding: '0.875rem 0',
              fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)',
              textDecoration: 'none', borderBottom: '1px solid var(--color-border)',
            }}>首页</Link>
            {navItems.map(item => (
              <Link key={item.id} href={item.url} target={item.target} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', padding: '0.875rem 0',
                fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)',
                textDecoration: 'none', borderBottom: '1px solid var(--color-border)',
              }}>{item.label}</Link>
            ))}
            <Link href="/search" onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem 0', fontSize: '1rem',
              color: 'var(--color-text-secondary)', textDecoration: 'none',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <SearchIcon size={16} />搜索
            </Link>
            <Link href="/admin" style={{
              display: 'inline-flex', alignItems: 'center', marginTop: '1.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '8px',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}>管理后台</Link>
          </nav>
        </div>
      )}
    </>
  )
}

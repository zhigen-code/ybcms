'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SiteSettings, NavItem } from '@/types'

interface Props { settings: Partial<SiteSettings> }

export default function FertilityHeader({ settings }: Props) {
  const siteName = (settings['site.name'] as string) || '生殖中心'
  const siteLogo = settings['site.logo'] as string | null
  const navItems = (settings['nav.main'] as NavItem[]) || []

  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const close = () => setMobileOpen(false)

  return (
    <>
      <style>{`
        .fh { position:sticky; top:0; z-index:100; background:#fff; border-bottom:1px solid var(--color-border); transition:box-shadow .25s; }
        .fh.scrolled { box-shadow:0 2px 16px rgba(193,123,138,.13); }
        .fh-inner { max-width:var(--max-width); margin:0 auto; padding:0 1.5rem; height:68px; display:flex; align-items:center; gap:2rem; }
        .fh-logo { font-family:var(--font-heading); font-size:1.15rem; font-weight:700; color:var(--color-text); text-decoration:none; letter-spacing:-.02em; display:flex; align-items:center; gap:9px; flex-shrink:0; }
        .fh-logo-dot { width:9px; height:9px; border-radius:50%; background:var(--color-primary); flex-shrink:0; }
        .fh-nav { display:flex; align-items:center; gap:2px; flex:1; }
        .fh-nav a { padding:.5rem .8rem; font-size:.875rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; border-radius:6px; transition:color .15s,background .15s; white-space:nowrap; }
        .fh-nav a:hover { color:var(--color-primary); background:rgba(193,123,138,.07); }
        .fh-cta { display:inline-flex; align-items:center; padding:9px 20px; background:var(--color-primary); color:#fff; border-radius:99px; font-size:.875rem; font-weight:600; text-decoration:none; transition:opacity .15s; flex-shrink:0; white-space:nowrap; }
        .fh-cta:hover { opacity:.88; }
        .fh-ham { display:none; flex-direction:column; justify-content:center; gap:5px; width:38px; height:38px; border:none; background:none; cursor:pointer; padding:5px; border-radius:7px; flex-shrink:0; margin-left:auto; }
        .fh-ham span { display:block; height:2px; background:var(--color-text); border-radius:2px; transition:transform .25s,opacity .25s; }
        .fh-overlay { position:fixed; inset:0; background:rgba(26,26,46,.45); z-index:99; backdrop-filter:blur(2px); }
        .fh-drawer { position:fixed; top:0; right:0; bottom:0; width:min(340px,90vw); background:#fff; z-index:100; display:flex; flex-direction:column; padding:1.5rem; box-shadow:-4px 0 24px rgba(0,0,0,.12); overflow-y:auto; }
        .fh-draw-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:2rem; }
        .fh-draw-close { width:36px; height:36px; border:none; background:rgba(193,123,138,.1); color:var(--color-primary); border-radius:8px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; }
        .fh-draw-nav { display:flex; flex-direction:column; gap:2px; flex:1; }
        .fh-draw-nav a { padding:.8rem 1rem; font-size:1rem; font-weight:500; color:var(--color-text); text-decoration:none; border-radius:8px; transition:background .15s,color .15s; }
        .fh-draw-nav a:hover { background:rgba(193,123,138,.09); color:var(--color-primary); }
        .fh-draw-cta { display:block; text-align:center; margin-top:1.5rem; padding:14px; background:var(--color-primary); color:#fff; border-radius:12px; font-size:1rem; font-weight:600; text-decoration:none; transition:opacity .15s; }
        .fh-draw-cta:hover { opacity:.88; }
        @media(max-width:960px) { .fh-nav,.fh-cta { display:none; } .fh-ham { display:flex; } }
      `}</style>

      <header className={`fh${scrolled ? ' scrolled' : ''}`}>
        <div className="fh-inner">
          <Link href="/" className="fh-logo">
            {siteLogo
              ? <img src={siteLogo} alt={siteName} style={{ height: '36px', objectFit: 'contain' }} />
              : <><span className="fh-logo-dot" />{siteName}</>
            }
          </Link>

          <nav className="fh-nav">
            {navItems.map(item => (
              <Link key={item.id} href={item.url} target={item.target}>{item.label}</Link>
            ))}
          </nav>

          <Link href="/contact" className="fh-cta">预约咨询</Link>

          <button className="fh-ham" onClick={() => setMobileOpen(true)} aria-label="菜单">
            <span /><span /><span />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="fh-overlay" onClick={close} />
          <div className="fh-drawer">
            <div className="fh-draw-head">
              <Link href="/" className="fh-logo" onClick={close}>
                <span className="fh-logo-dot" />{siteName}
              </Link>
              <button className="fh-draw-close" onClick={close}>✕</button>
            </div>
            <nav className="fh-draw-nav">
              {navItems.map(item => (
                <Link key={item.id} href={item.url} target={item.target} onClick={close}>{item.label}</Link>
              ))}
            </nav>
            <Link href="/contact" className="fh-draw-cta" onClick={close}>预约咨询</Link>
          </div>
        </>
      )}
    </>
  )
}

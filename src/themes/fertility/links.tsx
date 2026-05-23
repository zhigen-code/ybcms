'use client'

import Link from 'next/link'
import type { Link as FriendlyLink, SiteSettings } from '@/types'
import { ExternalLinkIcon, GlobeIcon } from '@/components/icons'

interface Props {
  links: FriendlyLink[]
  settings: SiteSettings
}

export default function FertilityLinks({ links, settings: _settings }: Props) {
  return (
    <main style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .fl-hero { background:linear-gradient(135deg,var(--color-bg-secondary),color-mix(in srgb,var(--color-primary) 7%,var(--color-bg))); border-bottom:1px solid var(--color-border); padding:3rem 1.5rem; }
        .fl-hero-inner { max-width:var(--max-width); margin:0 auto; }
        .fl-breadcrumb { font-size:.8rem; color:var(--color-text-muted); margin-bottom:1rem; }
        .fl-breadcrumb a { color:var(--color-text-muted); text-decoration:none; }
        .fl-breadcrumb a:hover { color:var(--color-primary); }
        .fl-hero h1 { font-family:var(--font-heading); font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:var(--color-text); letter-spacing:-.03em; margin-bottom:.375rem; }
        .fl-hero p { font-size:.875rem; color:var(--color-text-muted); }
        .fl-body { max-width:var(--max-width); margin:0 auto; padding:3rem 1.5rem 5rem; }
        .fl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }
        .fl-card { display:flex; align-items:flex-start; gap:12px; padding:1.125rem; border:1px solid var(--color-border); border-radius:14px; background:var(--color-bg); text-decoration:none; transition:border-color .15s,box-shadow .15s; }
        .fl-card:hover { border-color:var(--color-primary); box-shadow:0 2px 12px rgba(193,123,138,.1); }
        .fl-logo { width:40px; height:40px; border-radius:10px; object-fit:cover; flex-shrink:0; border:1px solid var(--color-border); }
        .fl-logo-ph { width:40px; height:40px; border-radius:10px; background:color-mix(in srgb,var(--color-primary) 12%,var(--color-bg-secondary)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .fl-name { font-size:.9375rem; font-weight:600; color:var(--color-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fl-desc { font-size:.8rem; color:var(--color-text-secondary); margin-top:3px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .fl-empty { text-align:center; padding:5rem 0; color:var(--color-text-muted); }
      `}</style>

      <div className="fl-hero">
        <div className="fl-hero-inner">
          <p className="fl-breadcrumb"><Link href="/">首页</Link> / 合作机构</p>
          <h1>合作机构</h1>
          <p>共 {links.length} 家合作伙伴</p>
        </div>
      </div>

      <div className="fl-body">
        {links.length === 0 ? (
          <div className="fl-empty">
            <p style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔗</p>
            <p>暂无合作机构</p>
          </div>
        ) : (
          <div className="fl-grid">
            {links.map(link => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="fl-card">
                {link.logo
                  ? <img src={link.logo} alt={link.name} className="fl-logo" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  : <div className="fl-logo-ph"><GlobeIcon size={16} /></div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="fl-name">{link.name}</span>
                    <span style={{ flexShrink: 0, color: 'var(--color-text-muted)', lineHeight: 0 }}><ExternalLinkIcon size={11} /></span>
                  </div>
                  {link.description && <p className="fl-desc">{link.description}</p>}
                </div>
              </a>
            ))}
          </div>
        )}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
          <Link href="/" style={{ fontSize: '.875rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-primary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)')}
          >← 返回首页</Link>
        </div>
      </div>
    </main>
  )
}

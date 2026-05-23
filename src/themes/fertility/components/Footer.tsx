import Link from 'next/link'
import type { SiteSettings, NavItem } from '@/types'

interface Props { settings: Partial<SiteSettings> }

export default function FertilityFooter({ settings }: Props) {
  const siteName = (settings['site.name'] as string) || '生殖中心'
  const siteDesc = settings['site.description'] as string | null
  const navItems = (settings['nav.footer'] as NavItem[]) || (settings['nav.main'] as NavItem[]) || []
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)', marginTop: '5rem' }}>
      <style>{`
        .ff-body { max-width:var(--max-width); margin:0 auto; padding:3.5rem 1.5rem 2.5rem; display:grid; grid-template-columns:1.6fr 1fr 1fr; gap:3rem; }
        .ff-brand-name { font-family:var(--font-heading); font-size:1.2rem; font-weight:700; color:var(--color-text); letter-spacing:-.02em; display:flex; align-items:center; gap:9px; margin-bottom:.875rem; text-decoration:none; }
        .ff-brand-dot { width:9px; height:9px; border-radius:50%; background:var(--color-primary); flex-shrink:0; }
        .ff-desc { font-size:.875rem; color:var(--color-text-secondary); line-height:1.8; max-width:300px; }
        .ff-col-title { font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:1rem; }
        .ff-nav { display:flex; flex-direction:column; gap:.625rem; }
        .ff-nav a { font-size:.875rem; color:var(--color-text-secondary); text-decoration:none; transition:color .15s; }
        .ff-nav a:hover { color:var(--color-primary); }
        .ff-bottom { max-width:var(--max-width); margin:0 auto; padding:1.25rem 1.5rem; border-top:1px solid var(--color-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.5rem; }
        .ff-bottom p { font-size:.8rem; color:var(--color-text-muted); }
        .ff-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border:1px solid var(--color-border); border-radius:99px; font-size:.75rem; color:var(--color-text-muted); text-decoration:none; transition:border-color .15s,color .15s; }
        .ff-badge:hover { border-color:var(--color-primary); color:var(--color-primary); }
        @media(max-width:768px) { .ff-body { grid-template-columns:1fr; gap:2rem; } }
      `}</style>

      <div className="ff-body">
        <div>
          <Link href="/" className="ff-brand-name">
            <span className="ff-brand-dot" />{siteName}
          </Link>
          {siteDesc && <p className="ff-desc">{siteDesc}</p>}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '.625rem' }}>
            <Link href="/search" className="ff-badge">搜索</Link>
            <Link href="/links" className="ff-badge">合作机构</Link>
            <Link href="/admin" className="ff-badge">管理后台</Link>
          </div>
        </div>

        {navItems.length > 0 && (
          <div>
            <p className="ff-col-title">导航</p>
            <nav className="ff-nav">
              {navItems.map(item => (
                <Link key={item.id} href={item.url} target={item.target}>{item.label}</Link>
              ))}
            </nav>
          </div>
        )}

        <div>
          <p className="ff-col-title">快速入口</p>
          <nav className="ff-nav">
            <Link href="/doctor">医生团队</Link>
            <Link href="/service">诊疗服务</Link>
            <Link href="/testimonial">患者故事</Link>
            <Link href="/contact">预约咨询</Link>
          </nav>
        </div>
      </div>

      <div className="ff-bottom">
        <p>© {year} {siteName}. 保留所有权利。</p>
        <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
          Powered by <Link href="/admin" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>AI CMS</Link>
        </p>
      </div>
    </footer>
  )
}

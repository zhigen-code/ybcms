import Link from 'next/link'
import type { ThemeArchiveProps } from '@/types/theme'
import type { Category } from '@/types'
import { formatDate } from '@/lib/utils'
import PaginationNav from '@/components/PaginationNav'

export default function FertilityCategory({ title, slug, description, coverImage, posts, pagination, siblings = [] }: ThemeArchiveProps) {
  const cats = siblings as Category[]

  return (
    <main style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .fca-hero { background:linear-gradient(135deg,var(--color-primary) 0%,#a0556a 100%); padding:clamp(2.5rem,6vw,4.5rem) 1.5rem; position:relative; overflow:hidden; }
        .fca-hero::after { content:''; position:absolute; top:-40%; right:-10%; width:500px; height:500px; border-radius:50%; background:rgba(255,255,255,.05); pointer-events:none; }
        .fca-hero-inner { max-width:var(--max-width); margin:0 auto; position:relative; z-index:1; }
        .fca-breadcrumb { font-size:.8rem; color:rgba(255,255,255,.65); margin-bottom:1rem; }
        .fca-breadcrumb a { color:rgba(255,255,255,.65); text-decoration:none; }
        .fca-breadcrumb a:hover { color:#fff; }
        .fca-hero h1 { font-family:var(--font-heading); font-size:clamp(1.75rem,4vw,2.5rem); font-weight:800; color:#fff; letter-spacing:-.03em; line-height:1.2; margin-bottom:.625rem; }
        .fca-hero p { font-size:.9375rem; color:rgba(255,255,255,.8); line-height:1.7; max-width:520px; }
        .fca-hero-cover { position:absolute; inset:0; object-fit:cover; width:100%; height:100%; opacity:.2; }
        .fca-body { max-width:var(--max-width); margin:0 auto; padding:3rem 1.5rem 5rem; }
        .fca-siblings { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:2.5rem; }
        .fca-sib-chip { display:inline-flex; align-items:center; padding:.35rem .875rem; border-radius:99px; border:1px solid var(--color-border); font-size:.82rem; font-weight:500; color:var(--color-text-secondary); text-decoration:none; transition:border-color .15s,color .15s,background .15s; background:var(--color-bg); }
        .fca-sib-chip:hover,.fca-sib-chip.active { border-color:var(--color-primary); color:var(--color-primary); background:color-mix(in srgb,var(--color-primary) 7%,var(--color-bg)); }
        .fca-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:900px){ .fca-grid{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .fca-grid{ grid-template-columns:1fr; } }
        .fca-card { background:var(--color-bg); border:1px solid var(--color-border); border-radius:14px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:box-shadow .2s,transform .2s; }
        .fca-card:hover { box-shadow:0 4px 20px rgba(193,123,138,.12); transform:translateY(-2px); }
        .fca-cover { aspect-ratio:16/9; object-fit:cover; width:100%; background:var(--color-bg-secondary); display:block; }
        .fca-cover-ph { aspect-ratio:16/9; background:color-mix(in srgb,var(--color-primary) 8%,var(--color-bg-secondary)); display:flex; align-items:center; justify-content:center; font-size:2rem; }
        .fca-info { padding:1.25rem; flex:1; display:flex; flex-direction:column; gap:.375rem; }
        .fca-title { font-family:var(--font-heading); font-size:.9375rem; font-weight:700; color:var(--color-text); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .fca-excerpt { font-size:.82rem; color:var(--color-text-muted); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; flex:1; }
        .fca-date { font-size:.75rem; color:var(--color-text-muted); margin-top:.25rem; }
        .fca-empty { text-align:center; padding:5rem 0; color:var(--color-text-muted); }
      `}</style>

      {/* Hero */}
      <div className="fca-hero">
        {coverImage && <img src={coverImage} alt={title} className="fca-hero-cover" />}
        <div className="fca-hero-inner">
          <p className="fca-breadcrumb">
            <Link href="/">首页</Link> / <Link href="/category">分类</Link> / {title}
          </p>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      <div className="fca-body">
        {/* Sibling categories */}
        {cats.length > 0 && (
          <div className="fca-siblings">
            {cats.map(cat => (
              <Link key={cat.id} href={`/category/${cat.slug}`} className={`fca-sib-chip${cat.slug === slug ? ' active' : ''}`}>
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="fca-empty">
            <p style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔍</p>
            <p>该分类下暂无内容</p>
          </div>
        ) : (
          <>
            <div className="fca-grid">
              {posts.map(post => (
                <Link key={post.id} href={`/post/${post.slug}`} className="fca-card">
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title} className="fca-cover" />
                    : <div className="fca-cover-ph">📰</div>
                  }
                  <div className="fca-info">
                    <div className="fca-title">{post.title}</div>
                    {post.excerpt && <div className="fca-excerpt">{post.excerpt}</div>}
                    <div className="fca-date">{post.published_at ? formatDate(post.published_at) : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: '2.5rem' }}>
              <PaginationNav
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                buildHref={p => p === 1 ? `/category/${slug}` : `/category/${slug}?page=${p}`}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

import Link from 'next/link'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContents } from '@/lib/db'
import type { ThemeHomeProps } from '@/types/theme'
import type { Content } from '@/types'
import { formatDate } from '@/lib/utils'

function parseFields(item: Content): Record<string, unknown> {
  if (!item.fields) return {}
  if (typeof item.fields === 'string') {
    try { return JSON.parse(item.fields) } catch { return {} }
  }
  return item.fields as Record<string, unknown>
}

function sf(f: Record<string, unknown>, key: string): string {
  const v = f[key]
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '.9rem', letterSpacing: '2px' }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default async function FertilityHome({ posts, settings, categories = [], pagination, tags = [] }: ThemeHomeProps) {
  const siteName   = (settings['site.name'] as string) || '生殖中心'
  const siteDesc   = settings['site.description'] as string | null
  const coverImage = posts[0]?.cover_image ?? null
  const totalPosts = pagination?.total ?? posts.length

  let services: Content[]     = []
  let doctors: Content[]      = []
  let testimonials: Content[] = []

  try {
    const { env } = getCloudflareContext()
    const [s, d, t] = await Promise.all([
      getContents(env.DB, { type: 'service',     status: 'published', pageSize: 6 }),
      getContents(env.DB, { type: 'doctor',      status: 'published', pageSize: 8 }),
      getContents(env.DB, { type: 'testimonial', status: 'published', pageSize: 6 }),
    ])
    services     = s.items
    doctors      = d.items
    testimonials = t.items
  } catch {
    // No content types registered yet — gracefully degrade
  }

  return (
    <main>
      <style>{`
        /* ── Hero ── */
        .fh-hero { position:relative; overflow:hidden; min-height:clamp(520px,72vh,780px); display:flex; align-items:flex-end; }
        .fh-hero-bg { position:absolute; inset:0; }
        .fh-hero-img { width:100%; height:100%; object-fit:cover; object-position:center top; }
        .fh-hero-gradient { position:absolute; inset:0; background:linear-gradient(135deg,rgba(193,123,138,.92) 0%,rgba(140,80,100,.88) 40%,rgba(90,45,65,.8) 100%); }
        .fh-hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(26,14,16,.7) 0%,rgba(0,0,0,.1) 60%,transparent 100%); }
        .fh-hero-inner { position:relative; z-index:2; width:100%; max-width:var(--max-width); margin:0 auto; padding:clamp(3rem,8vw,5rem) 1.5rem clamp(3rem,7vw,5rem); }
        .fh-hero h1 { font-family:var(--font-heading); font-size:clamp(2rem,6vw,3.75rem); font-weight:800; color:#fff; letter-spacing:-.035em; line-height:1.1; margin-bottom:1.25rem; text-shadow:0 2px 16px rgba(0,0,0,.25); max-width:680px; }
        .fh-hero-desc { font-size:clamp(1rem,2.2vw,1.15rem); color:rgba(255,255,255,.82); line-height:1.75; max-width:520px; margin-bottom:2.25rem; }
        .fh-hero-btns { display:flex; flex-wrap:wrap; gap:.875rem; margin-bottom:2.5rem; }
        .fh-btn-primary { display:inline-flex; align-items:center; padding:14px 28px; background:#fff; color:var(--color-primary); border-radius:99px; font-size:.9375rem; font-weight:700; text-decoration:none; transition:opacity .15s; font-family:var(--font-heading); }
        .fh-btn-primary:hover { opacity:.9; }
        .fh-btn-outline { display:inline-flex; align-items:center; padding:13px 24px; border:2px solid rgba(255,255,255,.6); color:#fff; border-radius:99px; font-size:.9375rem; font-weight:600; text-decoration:none; transition:border-color .15s,background .15s; }
        .fh-btn-outline:hover { border-color:#fff; background:rgba(255,255,255,.1); }
        /* ── Stats bar ── */
        .fh-stats { background:var(--color-primary); }
        .fh-stats-inner { max-width:var(--max-width); margin:0 auto; padding:1.5rem; display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,.15); }
        .fh-stat { background:var(--color-primary); padding:1.25rem 1.5rem; text-align:center; }
        .fh-stat-num { font-family:var(--font-heading); font-size:2rem; font-weight:800; color:#fff; line-height:1; margin-bottom:.25rem; }
        .fh-stat-label { font-size:.75rem; color:rgba(255,255,255,.75); font-weight:500; letter-spacing:.04em; }
        @media(max-width:640px){ .fh-stats-inner{ grid-template-columns:repeat(2,1fr); } }
        /* ── Section layout ── */
        .fh-section { max-width:var(--max-width); margin:0 auto; padding:clamp(3rem,6vw,5rem) 1.5rem; }
        .fh-section-alt { background:var(--color-bg-secondary); }
        .fh-section-alt .fh-section { background:transparent; }
        .fh-sec-hd { text-align:center; margin-bottom:clamp(2rem,4vw,3rem); }
        .fh-sec-hd .tag { display:inline-block; padding:.3rem .875rem; background:color-mix(in srgb,var(--color-primary) 10%,transparent); color:var(--color-primary); border-radius:99px; font-size:.75rem; font-weight:700; letter-spacing:.06em; margin-bottom:.875rem; }
        .fh-sec-hd h2 { font-family:var(--font-heading); font-size:clamp(1.6rem,3.5vw,2.25rem); font-weight:800; color:var(--color-text); letter-spacing:-.03em; line-height:1.2; margin-bottom:.75rem; }
        .fh-sec-hd p { font-size:1rem; color:var(--color-text-secondary); line-height:1.75; max-width:520px; margin:0 auto; }
        /* ── Service cards ── */
        .fh-services { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
        @media(max-width:900px){ .fh-services{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .fh-services{ grid-template-columns:1fr; } }
        .fh-svc-card { background:var(--color-bg); border:1px solid var(--color-border); border-radius:16px; padding:1.75rem; transition:box-shadow .2s,border-color .2s; text-decoration:none; display:flex; flex-direction:column; gap:1rem; }
        .fh-svc-card:hover { box-shadow:var(--shadow-md,0 4px 16px rgba(193,123,138,.12)); border-color:var(--color-primary); }
        .fh-svc-icon { width:52px; height:52px; border-radius:14px; background:color-mix(in srgb,var(--color-primary) 12%,transparent); display:flex; align-items:center; justify-content:center; font-size:1.5rem; }
        .fh-svc-name { font-family:var(--font-heading); font-size:1.05rem; font-weight:700; color:var(--color-text); line-height:1.3; }
        .fh-svc-desc { font-size:.875rem; color:var(--color-text-secondary); line-height:1.7; flex:1; }
        .fh-svc-meta { display:flex; flex-wrap:wrap; gap:.5rem; }
        .fh-svc-chip { font-size:.75rem; color:var(--color-primary); background:color-mix(in srgb,var(--color-primary) 8%,transparent); padding:.2rem .65rem; border-radius:99px; }
        .fh-svc-link { font-size:.85rem; font-weight:600; color:var(--color-primary); display:inline-flex; align-items:center; gap:4px; margin-top:auto; }
        /* ── Doctor cards ── */
        .fh-doctors { display:grid; grid-template-columns:repeat(4,1fr); gap:1.5rem; }
        @media(max-width:900px){ .fh-doctors{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:480px){ .fh-doctors{ grid-template-columns:1fr 1fr; gap:1rem; } }
        .fh-doc-card { text-align:center; text-decoration:none; }
        .fh-doc-avatar { width:100%; aspect-ratio:1; border-radius:16px; object-fit:cover; object-position:top; background:var(--color-bg-secondary); margin-bottom:1rem; border:3px solid var(--color-border); transition:border-color .2s; }
        .fh-doc-card:hover .fh-doc-avatar { border-color:var(--color-primary); }
        .fh-doc-avatar-placeholder { width:100%; aspect-ratio:1; border-radius:16px; background:color-mix(in srgb,var(--color-primary) 12%,var(--color-bg-secondary)); display:flex; align-items:center; justify-content:center; font-size:3rem; margin-bottom:1rem; border:3px solid var(--color-border); transition:border-color .2s; }
        .fh-doc-card:hover .fh-doc-avatar-placeholder { border-color:var(--color-primary); }
        .fh-doc-name { font-family:var(--font-heading); font-size:1rem; font-weight:700; color:var(--color-text); margin-bottom:.25rem; }
        .fh-doc-position { font-size:.8rem; color:var(--color-primary); font-weight:600; margin-bottom:.25rem; }
        .fh-doc-dept { font-size:.78rem; color:var(--color-text-muted); }
        /* ── Testimonials ── */
        .fh-testimonials { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:900px){ .fh-testimonials{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .fh-testimonials{ grid-template-columns:1fr; } }
        .fh-test-card { background:var(--color-bg); border:1px solid var(--color-border); border-radius:16px; padding:1.75rem; display:flex; flex-direction:column; gap:.875rem; }
        .fh-test-body { font-size:.9rem; color:var(--color-text-secondary); line-height:1.8; flex:1; font-style:italic; }
        .fh-test-meta { display:flex; align-items:center; gap:.75rem; padding-top:.875rem; border-top:1px solid var(--color-border); }
        .fh-test-avatar { width:36px; height:36px; border-radius:50%; background:color-mix(in srgb,var(--color-primary) 20%,transparent); display:flex; align-items:center; justify-content:center; font-size:.9rem; font-weight:700; color:var(--color-primary); flex-shrink:0; }
        .fh-test-name { font-weight:600; font-size:.875rem; color:var(--color-text); }
        .fh-test-type { font-size:.75rem; color:var(--color-text-muted); }
        /* ── Articles ── */
        .fh-articles { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5rem; }
        @media(max-width:900px){ .fh-articles{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .fh-articles{ grid-template-columns:1fr; } }
        .fh-art-card { background:var(--color-bg); border:1px solid var(--color-border); border-radius:14px; overflow:hidden; text-decoration:none; transition:box-shadow .2s,transform .2s; display:flex; flex-direction:column; }
        .fh-art-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); }
        .fh-art-cover { aspect-ratio:16/9; object-fit:cover; width:100%; background:var(--color-bg-secondary); display:block; }
        .fh-art-cover-placeholder { aspect-ratio:16/9; background:color-mix(in srgb,var(--color-primary) 10%,var(--color-bg-secondary)); display:flex; align-items:center; justify-content:center; font-size:2.5rem; }
        .fh-art-body { padding:1.25rem; flex:1; display:flex; flex-direction:column; gap:.5rem; }
        .fh-art-cat { font-size:.72rem; font-weight:700; color:var(--color-primary); letter-spacing:.04em; text-transform:uppercase; }
        .fh-art-title { font-family:var(--font-heading); font-size:1rem; font-weight:700; color:var(--color-text); line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .fh-art-meta { font-size:.78rem; color:var(--color-text-muted); margin-top:auto; }
        /* ── CTA banner ── */
        .fh-cta-wrap { background:linear-gradient(135deg,var(--color-primary) 0%,#a0556a 100%); }
        .fh-cta-inner { max-width:var(--max-width); margin:0 auto; padding:clamp(3rem,6vw,5rem) 1.5rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:2rem; }
        .fh-cta-inner h2 { font-family:var(--font-heading); font-size:clamp(1.5rem,3.5vw,2rem); font-weight:800; color:#fff; letter-spacing:-.03em; line-height:1.2; }
        .fh-cta-inner p { font-size:.95rem; color:rgba(255,255,255,.8); margin-top:.5rem; }
        .fh-cta-btn { display:inline-flex; padding:14px 32px; background:#fff; color:var(--color-primary); border-radius:99px; font-size:1rem; font-weight:700; text-decoration:none; flex-shrink:0; transition:opacity .15s; font-family:var(--font-heading); }
        .fh-cta-btn:hover { opacity:.92; }
        /* ── View all link ── */
        .fh-view-all { text-align:center; margin-top:2.5rem; }
        .fh-view-all a { display:inline-flex; align-items:center; gap:6px; padding:10px 24px; border:1.5px solid var(--color-border); border-radius:99px; font-size:.875rem; font-weight:600; color:var(--color-text-secondary); text-decoration:none; transition:border-color .15s,color .15s; }
        .fh-view-all a:hover { border-color:var(--color-primary); color:var(--color-primary); }
      `}</style>

      {/* ── Hero ── */}
      <section className="fh-hero">
        <div className="fh-hero-bg">
          {coverImage
            ? <img src={coverImage} alt="" className="fh-hero-img" />
            : null
          }
          <div className="fh-hero-gradient" />
          <div className="fh-hero-overlay" />
        </div>
        <div className="fh-hero-inner">
          <h1>{siteName}</h1>
          {siteDesc && <p className="fh-hero-desc">{siteDesc}</p>}
          <div className="fh-hero-btns">
            <Link href="/contact" className="fh-btn-primary">立即预约咨询</Link>
            {services.length > 0 && (
              <Link href="/service" className="fh-btn-outline">了解诊疗服务</Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="fh-stats">
        <div className="fh-stats-inner">
          {[
            { num: '15+', label: '年专业经验' },
            { num: '60%+', label: '试管成功率' },
            { num: '10000+', label: '成功案例' },
            { num: '30+', label: '专业医疗团队' },
          ].map(s => (
            <div key={s.label} className="fh-stat">
              <div className="fh-stat-num">{s.num}</div>
              <div className="fh-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Services ── */}
      {services.length > 0 && (
        <div style={{ background: 'var(--color-bg)' }}>
          <div className="fh-section">
            <div className="fh-sec-hd">
              <span className="tag">SERVICES</span>
              <h2>我们的诊疗服务</h2>
              <p>专业团队为您提供全面的生殖医学诊疗方案，从检查到治疗全程护航</p>
            </div>
            <div className="fh-services">
              {services.map(svc => {
                const f = parseFields(svc)
                return (
                  <Link key={svc.id} href={`/service/${svc.slug}`} className="fh-svc-card">
                    <div className="fh-svc-icon">🏥</div>
                    <div>
                      <div className="fh-svc-name">{svc.title}</div>
                      {svc.excerpt && <p className="fh-svc-desc">{svc.excerpt}</p>}
                    </div>
                    <div className="fh-svc-meta">
                      {sf(f, 'duration') && <span className="fh-svc-chip">疗程 {sf(f, 'duration')}</span>}
                      {sf(f, 'success_rate') && <span className="fh-svc-chip">成功率 {sf(f, 'success_rate')}</span>}
                    </div>
                    <span className="fh-svc-link">了解详情 →</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Doctors ── */}
      {doctors.length > 0 && (
        <div className="fh-section-alt">
          <div className="fh-section">
            <div className="fh-sec-hd">
              <span className="tag">OUR TEAM</span>
              <h2>专业医生团队</h2>
              <p>汇聚国内外顶尖生殖医学专家，为您提供权威的医疗指导</p>
            </div>
            <div className="fh-doctors">
              {doctors.map(doc => {
                const f = parseFields(doc)
                return (
                  <Link key={doc.id} href={`/author/${doc.author?.id ?? doc.id}`} className="fh-doc-card">
                    {doc.cover_image
                      ? <img src={doc.cover_image} alt={doc.title} className="fh-doc-avatar" />
                      : <div className="fh-doc-avatar-placeholder">👨‍⚕️</div>
                    }
                    <div className="fh-doc-name">{doc.title}</div>
                    {sf(f, 'position') && <div className="fh-doc-position">{sf(f, 'position')}</div>}
                    {sf(f, 'department') && <div className="fh-doc-dept">{sf(f, 'department')}</div>}
                  </Link>
                )
              })}
            </div>
            <div className="fh-view-all">
              <Link href="/doctor">查看全部医生团队 →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <div style={{ background: 'var(--color-bg)' }}>
          <div className="fh-section">
            <div className="fh-sec-hd">
              <span className="tag">STORIES</span>
              <h2>患者的故事</h2>
              <p>每一个新生命的到来，都是我们共同努力的成果</p>
            </div>
            <div className="fh-testimonials">
              {testimonials.map(t => {
                const f = parseFields(t)
                const nickname = (f.nickname as string) || t.title || '匿名用户'
                const treatmentType = (f.treatment_type as string) || ''
                const ratingMap: Record<string, number> = { '五星': 5, '四星': 4, '三星': 3 }
                const stars = ratingMap[(f.rating as string) || '五星'] ?? 5
                const initial = nickname.slice(0, 1)
                return (
                  <div key={t.id} className="fh-test-card">
                    <Stars n={stars} />
                    <p className="fh-test-body">
                      {t.excerpt || (t.content ? t.content.replace(/<[^>]+>/g, '').slice(0, 150) + '…' : '感谢医疗团队的精心治疗。')}
                    </p>
                    <div className="fh-test-meta">
                      <div className="fh-test-avatar">{initial}</div>
                      <div>
                        <div className="fh-test-name">{nickname}</div>
                        {treatmentType && <div className="fh-test-type">{treatmentType}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Articles ── */}
      {posts.length > 0 && (
        <div className="fh-section-alt">
          <div className="fh-section">
            <div className="fh-sec-hd">
              <span className="tag">NEWS</span>
              <h2>科普资讯</h2>
              <p>专业医学知识分享，让您更了解生殖健康</p>
            </div>
            <div className="fh-articles">
              {posts.slice(0, 3).map(post => (
                <Link key={post.id} href={`/post/${post.slug}`} className="fh-art-card">
                  {post.cover_image
                    ? <img src={post.cover_image} alt={post.title} className="fh-art-cover" />
                    : <div className="fh-art-cover-placeholder">📰</div>
                  }
                  <div className="fh-art-body">
                    {post.categories?.[0] && <div className="fh-art-cat">{post.categories[0].name}</div>}
                    <div className="fh-art-title">{post.title}</div>
                    <div className="fh-art-meta">
                      {post.published_at ? formatDate(post.published_at) : ''}
                      {totalPosts > 3 && ` · 共 ${totalPosts} 篇`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {totalPosts > 3 && (
              <div className="fh-view-all">
                <Link href="/?all=1">查看全部 {totalPosts} 篇文章 →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CTA Banner ── */}
      <div className="fh-cta-wrap">
        <div className="fh-cta-inner">
          <div>
            <h2>开始您的求子之旅</h2>
            <p>专业医生团队一对一咨询，制定个性化治疗方案</p>
          </div>
          <Link href="/contact" className="fh-cta-btn">立即预约</Link>
        </div>
      </div>
    </main>
  )
}

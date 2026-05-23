'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { Content, SiteSettings, Form } from '@/types'
import { formatDate, estimateReadingTime } from '@/lib/utils'

import TableOfContents from '@/themes/default/components/TableOfContents'
import ReadingProgress from '@/themes/default/components/ReadingProgress'
import BackToTop from '@/themes/default/components/BackToTop'
import InlineForm from '@/themes/default/components/InlineForm'

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

interface Props {
  post: Content
  settings: SiteSettings
  related?: Content[]
  embeddedForms?: Form[]
}

function ProseWithForms({ html, forms }: { html: string; forms: Form[] }) {
  const formMap = Object.fromEntries(forms.map(f => [f.slug, f]))
  const parts = html.split(/<div[^>]*data-form="([^"]+)"[^>]*><\/div>/g)
  if (parts.length === 1) {
    return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part.trim() ? <div key={i} className="prose" dangerouslySetInnerHTML={{ __html: part }} /> : null
        const form = formMap[part]
        return form ? <InlineForm key={i} form={form} /> : null
      })}
    </>
  )
}

export default function FertilityPost({ post, settings: _settings, related = [], embeddedForms = [] }: Props) {
  const readTime = post.content ? estimateReadingTime(post.content) : 0
  const date     = post.published_at ? formatDate(post.published_at) : null
  const fields   = parseFields(post)
  const isDoctor  = post.type === 'doctor'
  const isService = post.type === 'service'

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/shj-github-dark.css'
    document.head.appendChild(link)
    import('@speed-highlight/core').then(({ highlightAll }) => { highlightAll() }).catch(() => {})
    return () => { link.remove() }
  }, [post.content])

  return (
    <>
      <ReadingProgress />
      <main>
        <style>{`
          .fp-hero { position:relative; overflow:hidden; }
          .fp-hero img { width:100%; max-height:480px; object-fit:cover; display:block; }
          .fp-hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(26,14,16,.6) 0%,transparent 60%); }
          .fp-wrap { max-width:var(--max-width); margin:0 auto; padding:3rem 1.5rem 5rem; display:grid; grid-template-columns:1fr 280px; gap:3.5rem; align-items:start; }
          @media(max-width:900px){ .fp-wrap{ grid-template-columns:1fr; } .fp-toc{ display:none; } }
          .fp-main { min-width:0; }
          .fp-breadcrumb { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:1.75rem; }
          .fp-breadcrumb a { font-size:.82rem; color:var(--color-text-muted); text-decoration:none; transition:color .15s; }
          .fp-breadcrumb a:hover { color:var(--color-primary); }
          .fp-breadcrumb span { font-size:.82rem; color:var(--color-border); }
          .fp-breadcrumb .current { font-size:.82rem; color:var(--color-text-secondary); }
          .fp-cats { display:flex; flex-wrap:wrap; gap:.5rem; margin-bottom:1.25rem; }
          .fp-cat { display:inline-flex; align-items:center; padding:.25rem .75rem; background:color-mix(in srgb,var(--color-primary) 10%,transparent); color:var(--color-primary); border-radius:99px; font-size:.75rem; font-weight:700; text-decoration:none; letter-spacing:.03em; transition:background .15s; }
          .fp-cat:hover { background:color-mix(in srgb,var(--color-primary) 18%,transparent); }
          .fp-h1 { font-family:var(--font-heading); font-size:clamp(1.6rem,3.5vw,2.375rem); font-weight:800; color:var(--color-text); letter-spacing:-.035em; line-height:1.2; margin-bottom:1.25rem; }
          .fp-excerpt { font-size:1.05rem; color:var(--color-text-secondary); line-height:1.75; margin-bottom:1.75rem; border-left:3px solid var(--color-primary); padding-left:1.25rem; }
          .fp-meta { display:flex; flex-wrap:wrap; align-items:center; gap:1.25rem; padding:1rem 0; border-top:1px solid var(--color-border); border-bottom:1px solid var(--color-border); margin-bottom:2.5rem; }
          .fp-meta-item { font-size:.82rem; color:var(--color-text-muted); display:flex; align-items:center; gap:5px; }
          .fp-author-link { text-decoration:none; color:var(--color-text-secondary); font-weight:600; font-size:.85rem; transition:color .15s; }
          .fp-author-link:hover { color:var(--color-primary); }
          .fp-tags { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:3rem; padding-top:2rem; border-top:1px solid var(--color-border); }
          .fp-tag { display:inline-flex; align-items:center; gap:3px; padding:.3rem .75rem; border:1px solid var(--color-border); border-radius:99px; font-size:.8rem; color:var(--color-text-secondary); text-decoration:none; transition:border-color .15s,color .15s; }
          .fp-tag:hover { border-color:var(--color-primary); color:var(--color-primary); }
          /* Author card */
          .fp-author-card { margin-top:3rem; padding:1.75rem; background:var(--color-bg-secondary); border-radius:16px; border:1px solid var(--color-border); display:flex; gap:1.25rem; align-items:flex-start; }
          .fp-author-avatar { width:64px; height:64px; border-radius:50%; object-fit:cover; flex-shrink:0; border:3px solid var(--color-border); }
          .fp-author-avatar-placeholder { width:64px; height:64px; border-radius:50%; background:color-mix(in srgb,var(--color-primary) 15%,transparent); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:700; color:var(--color-primary); flex-shrink:0; }
          .fp-author-name { font-family:var(--font-heading); font-size:1rem; font-weight:700; color:var(--color-text); margin-bottom:.25rem; }
          .fp-author-bio { font-size:.875rem; color:var(--color-text-secondary); line-height:1.7; margin-top:.375rem; }
          /* Related */
          .fp-related { margin-top:4rem; }
          .fp-related-title { font-family:var(--font-heading); font-size:1.125rem; font-weight:700; color:var(--color-text); margin-bottom:1.5rem; display:flex; align-items:center; gap:.75rem; }
          .fp-related-title::after { content:''; flex:1; height:1px; background:var(--color-border); }
          .fp-related-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
          @media(max-width:560px){ .fp-related-grid{ grid-template-columns:1fr; } }
          .fp-related-card { display:flex; gap:1rem; text-decoration:none; padding:.75rem; border-radius:12px; border:1px solid var(--color-border); background:var(--color-bg); transition:border-color .15s,box-shadow .15s; }
          .fp-related-card:hover { border-color:var(--color-primary); box-shadow:0 2px 12px rgba(193,123,138,.1); }
          .fp-related-thumb { width:72px; height:54px; border-radius:8px; object-fit:cover; flex-shrink:0; background:var(--color-bg-secondary); }
          .fp-related-info { flex:1; min-width:0; }
          .fp-related-info-title { font-size:.875rem; font-weight:600; color:var(--color-text); line-height:1.45; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
          .fp-related-info-date { font-size:.75rem; color:var(--color-text-muted); margin-top:.25rem; }
          /* TOC sidebar */
          .fp-toc { position:sticky; top:88px; max-height:calc(100vh - 120px); overflow-y:auto; }
          /* Info panel (doctor / service) */
          .fp-info-panel { background:color-mix(in srgb,var(--color-primary) 5%,var(--color-bg-secondary)); border:1px solid color-mix(in srgb,var(--color-primary) 20%,var(--color-border)); border-radius:14px; padding:1.5rem; margin-bottom:2rem; }
          .fp-info-panel-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.25rem; }
          .fp-info-panel-label { font-size:.72rem; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--color-primary); }
          .fp-info-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:.875rem 1.25rem; }
          .fp-info-item-label { font-size:.7rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:.25rem; }
          .fp-info-item-value { font-size:.875rem; color:var(--color-text-secondary); line-height:1.6; }
          .fp-info-wide { grid-column:1/-1; }
          .fp-appt-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.55rem 1.375rem; background:var(--color-primary); color:#fff; border-radius:99px; font-size:.875rem; font-weight:600; text-decoration:none; transition:background .15s,transform .1s; white-space:nowrap; }
          .fp-appt-btn:hover { background:var(--color-primary-hover); transform:translateY(-1px); }
        `}</style>

        {/* Cover */}
        {post.cover_image && (
          <div className="fp-hero">
            <img src={post.cover_image} alt={post.title} />
            <div className="fp-hero-overlay" />
          </div>
        )}

        <div className="fp-wrap">
          <article className="fp-main">
            {/* Breadcrumb */}
            <nav className="fp-breadcrumb">
              <Link href="/">首页</Link>
              <span>/</span>
              {isDoctor
                ? <><Link href="/doctor">医生团队</Link><span>/</span></>
                : isService
                  ? <><Link href="/service">诊疗服务</Link><span>/</span></>
                  : post.categories?.[0]
                    ? <><Link href={`/category/${post.categories[0].slug}`}>{post.categories[0].name}</Link><span>/</span></>
                    : null
              }
              <span className="current">{post.title}</span>
            </nav>

            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <div className="fp-cats">
                {post.categories.map(cat => (
                  <Link key={cat.id} href={`/category/${cat.slug}`} className="fp-cat">{cat.name}</Link>
                ))}
              </div>
            )}

            <h1 className="fp-h1">{post.title}</h1>
            {post.excerpt && <p className="fp-excerpt">{post.excerpt}</p>}

            {/* Meta */}
            <div className="fp-meta">
              {post.author && (
                <span className="fp-meta-item">
                  <Link href={`/author/${post.author.id}`} className="fp-author-link">{post.author.name}</Link>
                </span>
              )}
              {date && <span className="fp-meta-item">📅 {date}</span>}
              {readTime > 0 && <span className="fp-meta-item">⏱ 约 {readTime} 分钟阅读</span>}
            </div>

            {/* Doctor info panel */}
            {isDoctor && (sf(fields, 'position') || sf(fields, 'department') || sf(fields, 'years_experience') || sf(fields, 'specialties') || sf(fields, 'education') || sf(fields, 'appointment_url')) && (
              <div className="fp-info-panel">
                <div className="fp-info-panel-head">
                  <span className="fp-info-panel-label">👨‍⚕️ 医生信息</span>
                  {sf(fields, 'appointment_url')
                    ? <a href={sf(fields, 'appointment_url')} className="fp-appt-btn" target="_blank" rel="noopener noreferrer">预约挂号 →</a>
                    : <Link href="/contact" className="fp-appt-btn">预约咨询 →</Link>
                  }
                </div>
                <div className="fp-info-grid">
                  {sf(fields, 'position') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">职称</div>
                      <div className="fp-info-item-value">{sf(fields, 'position')}</div>
                    </div>
                  )}
                  {sf(fields, 'department') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">所属科室</div>
                      <div className="fp-info-item-value">{sf(fields, 'department')}</div>
                    </div>
                  )}
                  {sf(fields, 'years_experience') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">从业年限</div>
                      <div className="fp-info-item-value">{sf(fields, 'years_experience')} 年</div>
                    </div>
                  )}
                  {sf(fields, 'specialties') && (
                    <div className="fp-info-item fp-info-wide">
                      <div className="fp-info-item-label">专长方向</div>
                      <div className="fp-info-item-value">{sf(fields, 'specialties')}</div>
                    </div>
                  )}
                  {sf(fields, 'education') && (
                    <div className="fp-info-item fp-info-wide">
                      <div className="fp-info-item-label">教育背景</div>
                      <div className="fp-info-item-value">{sf(fields, 'education')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service info panel */}
            {isService && (sf(fields, 'subtitle') || sf(fields, 'suitable_for') || sf(fields, 'duration') || sf(fields, 'price_range') || sf(fields, 'success_rate')) && (
              <div className="fp-info-panel">
                <div className="fp-info-panel-head">
                  <span className="fp-info-panel-label">🏥 服务详情</span>
                </div>
                {sf(fields, 'subtitle') && (
                  <p style={{ fontSize: '.9375rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.7 }}>{sf(fields, 'subtitle')}</p>
                )}
                <div className="fp-info-grid">
                  {sf(fields, 'duration') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">疗程周期</div>
                      <div className="fp-info-item-value">{sf(fields, 'duration')}</div>
                    </div>
                  )}
                  {sf(fields, 'price_range') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">费用区间</div>
                      <div className="fp-info-item-value">{sf(fields, 'price_range')}</div>
                    </div>
                  )}
                  {sf(fields, 'success_rate') && (
                    <div className="fp-info-item">
                      <div className="fp-info-item-label">参考成功率</div>
                      <div className="fp-info-item-value">{sf(fields, 'success_rate')}</div>
                    </div>
                  )}
                  {sf(fields, 'suitable_for') && (
                    <div className="fp-info-item fp-info-wide">
                      <div className="fp-info-item-label">适合人群</div>
                      <div className="fp-info-item-value">{sf(fields, 'suitable_for')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            {post.content && (
              <ProseWithForms html={post.content} forms={embeddedForms} />
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="fp-tags">
                {post.tags.map(tag => (
                  <Link key={tag.id} href={`/tag/${tag.slug}`} className="fp-tag">
                    <span style={{ opacity: .5, fontSize: '.8em' }}>#</span>{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Author card */}
            {post.author && (
              <div className="fp-author-card">
                {post.author.avatar
                  ? <img src={post.author.avatar} alt={post.author.name} className="fp-author-avatar" />
                  : <div className="fp-author-avatar-placeholder">{post.author.name.slice(0, 1)}</div>
                }
                <div>
                  <div className="fp-author-name">{post.author.name}</div>
                  <Link href={`/author/${post.author.id}`} style={{ fontSize: '.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>查看医生主页 →</Link>
                </div>
              </div>
            )}

            {/* Related */}
            {related.length > 0 && (
              <div className="fp-related">
                <div className="fp-related-title">相关文章</div>
                <div className="fp-related-grid">
                  {related.map(r => (
                    <Link key={r.id} href={`/post/${r.slug}`} className="fp-related-card">
                      {r.cover_image
                        ? <img src={r.cover_image} alt={r.title} className="fp-related-thumb" />
                        : <div className="fp-related-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📰</div>
                      }
                      <div className="fp-related-info">
                        <div className="fp-related-info-title">{r.title}</div>
                        <div className="fp-related-info-date">{r.published_at ? formatDate(r.published_at) : ''}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* TOC sidebar */}
          {post.content && (
            <aside className="fp-toc">
              <TableOfContents />
            </aside>
          )}
        </div>
      </main>
      <BackToTop />
    </>
  )
}

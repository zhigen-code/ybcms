import Link from 'next/link'
import type { ThemeAuthorProps } from '@/types/theme'
import type { Content } from '@/types'
import { formatDate } from '@/lib/utils'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContents } from '@/lib/db'

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

// Try to find the doctor content record matching this author
async function findDoctorContent(authorId: string): Promise<Content | null> {
  try {
    const { env } = getCloudflareContext()
    const { items } = await getContents(env.DB, { type: 'doctor', status: 'published', authorId, pageSize: 1 })
    return items[0] ?? null
  } catch {
    return null
  }
}

export default async function FertilityAuthor({ author, posts, pagination }: ThemeAuthorProps) {
  const doctorContent = await findDoctorContent(author.id)
  const fields = doctorContent ? parseFields(doctorContent) : {}

  const initial = (author.name || '?').slice(0, 1).toUpperCase()

  return (
    <main style={{ background: 'var(--color-bg)' }}>
      <style>{`
        .fa-hero { background:var(--color-bg-secondary); border-bottom:1px solid var(--color-border); padding:3rem 1.5rem; }
        .fa-hero-inner { max-width:860px; margin:0 auto; display:flex; gap:2.5rem; align-items:flex-start; }
        @media(max-width:640px){ .fa-hero-inner{ flex-direction:column; align-items:center; text-align:center; } }
        .fa-avatar { width:120px; height:120px; border-radius:20px; object-fit:cover; object-position:top; flex-shrink:0; border:3px solid var(--color-border); }
        .fa-avatar-placeholder { width:120px; height:120px; border-radius:20px; background:color-mix(in srgb,var(--color-primary) 15%,var(--color-bg)); display:flex; align-items:center; justify-content:center; font-size:2.5rem; font-weight:800; color:var(--color-primary); flex-shrink:0; border:3px solid var(--color-border); }
        .fa-info { flex:1; min-width:0; }
        .fa-breadcrumb { font-size:.8rem; color:var(--color-text-muted); margin-bottom:.875rem; }
        .fa-breadcrumb a { color:var(--color-text-muted); text-decoration:none; }
        .fa-breadcrumb a:hover { color:var(--color-primary); }
        .fa-name { font-family:var(--font-heading); font-size:clamp(1.5rem,4vw,2rem); font-weight:800; color:var(--color-text); letter-spacing:-.03em; margin-bottom:.5rem; }
        .fa-position { font-size:.9rem; font-weight:600; color:var(--color-primary); margin-bottom:.25rem; }
        .fa-dept { font-size:.85rem; color:var(--color-text-muted); margin-bottom:1rem; }
        .fa-bio { font-size:.9375rem; color:var(--color-text-secondary); line-height:1.8; max-width:560px; }
        .fa-fields { display:flex; flex-wrap:wrap; gap:1rem; margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid var(--color-border); }
        @media(max-width:640px){ .fa-fields{ justify-content:center; } }
        .fa-field { }
        .fa-field-label { font-size:.7rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--color-text-muted); margin-bottom:.25rem; }
        .fa-field-value { font-size:.875rem; color:var(--color-text-secondary); line-height:1.6; max-width:260px; }
        .fa-appt-btn { display:inline-flex; align-items:center; gap:6px; margin-top:1.5rem; padding:10px 22px; background:var(--color-primary); color:#fff; border-radius:99px; font-size:.875rem; font-weight:600; text-decoration:none; transition:opacity .15s; }
        .fa-appt-btn:hover { opacity:.88; }
        /* Posts section */
        .fa-posts { max-width:860px; margin:3rem auto; padding:0 1.5rem 5rem; }
        .fa-posts-title { font-family:var(--font-heading); font-size:1.1rem; font-weight:700; color:var(--color-text); margin-bottom:1.5rem; display:flex; align-items:center; gap:.75rem; }
        .fa-posts-title::after { content:''; flex:1; height:1px; background:var(--color-border); }
        .fa-post-item { display:flex; gap:1.25rem; padding:1.25rem 0; border-bottom:1px solid var(--color-border); text-decoration:none; align-items:center; }
        .fa-post-item:last-child { border-bottom:none; }
        .fa-post-thumb { width:80px; height:60px; border-radius:10px; object-fit:cover; flex-shrink:0; background:var(--color-bg-secondary); }
        .fa-post-title { font-size:.9375rem; font-weight:600; color:var(--color-text); line-height:1.45; margin-bottom:.25rem; transition:color .15s; }
        .fa-post-item:hover .fa-post-title { color:var(--color-primary); }
        .fa-post-date { font-size:.78rem; color:var(--color-text-muted); }
        .fa-empty { text-align:center; padding:4rem 0; color:var(--color-text-muted); }
      `}</style>

      {/* Doctor Hero */}
      <section className="fa-hero">
        <div className="fa-hero-inner">
          {/* Avatar */}
          {doctorContent?.cover_image
            ? <img src={doctorContent.cover_image} alt={author.name} className="fa-avatar" />
            : author.avatar
              ? <img src={author.avatar} alt={author.name} className="fa-avatar" />
              : <div className="fa-avatar-placeholder">{initial}</div>
          }

          <div className="fa-info">
            <p className="fa-breadcrumb">
              <Link href="/">首页</Link> / <Link href="/doctor">医生团队</Link> / {author.name}
            </p>
            <h1 className="fa-name">{author.name}</h1>
            {sf(fields, 'position') && <p className="fa-position">{sf(fields, 'position')}</p>}
            {sf(fields, 'department') && <p className="fa-dept">{sf(fields, 'department')}</p>}
            {doctorContent?.excerpt && (
              <p className="fa-bio">{doctorContent.excerpt}</p>
            )}

            {/* Doctor-specific fields */}
            {(sf(fields, 'specialties') || sf(fields, 'education') || sf(fields, 'years_experience')) && (
              <div className="fa-fields">
                {sf(fields, 'years_experience') && (
                  <div className="fa-field">
                    <div className="fa-field-label">从业年限</div>
                    <div className="fa-field-value">{sf(fields, 'years_experience')} 年</div>
                  </div>
                )}
                {sf(fields, 'specialties') && (
                  <div className="fa-field">
                    <div className="fa-field-label">专长方向</div>
                    <div className="fa-field-value">{sf(fields, 'specialties')}</div>
                  </div>
                )}
                {sf(fields, 'education') && (
                  <div className="fa-field">
                    <div className="fa-field-label">教育背景</div>
                    <div className="fa-field-value">{sf(fields, 'education')}</div>
                  </div>
                )}
              </div>
            )}

            {sf(fields, 'appointment_url')
              ? <a href={sf(fields, 'appointment_url')} className="fa-appt-btn" target="_blank" rel="noopener noreferrer">预约挂号 →</a>
              : <Link href="/contact" className="fa-appt-btn">预约咨询 →</Link>
            }
          </div>
        </div>
      </section>

      {/* Articles by this doctor */}
      <div className="fa-posts">
        <div className="fa-posts-title">
          {author.name}的文章
          <span style={{ fontSize: '.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>共 {pagination.total} 篇</span>
        </div>

        {posts.length === 0 ? (
          <div className="fa-empty">暂无文章</div>
        ) : (
          posts.map(post => (
            <Link key={post.id} href={`/post/${post.slug}`} className="fa-post-item">
              {post.cover_image
                ? <img src={post.cover_image} alt={post.title} className="fa-post-thumb" />
                : <div className="fa-post-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📰</div>
              }
              <div>
                <div className="fa-post-title">{post.title}</div>
                <div className="fa-post-date">{post.published_at ? formatDate(post.published_at) : ''}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}

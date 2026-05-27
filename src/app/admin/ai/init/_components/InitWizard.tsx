'use client'

import { useState, useEffect } from 'react'
import type { InitBasicInfo, InitPlan, InitTeamMember, InitService, InitCase } from '@/types'

const STORAGE_KEY = 'cms_init_wizard'

function loadSaved(): Partial<{ step: number; basicInfo: InitBasicInfo; contentSourceUrl: string; styleReferenceUrl: string; plan: InitPlan }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveDraft(data: object) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ─── design tokens ────────────────────────────────────────────
const C = {
  border:    '#e4e4e7', bg: '#ffffff', bgSubtle: '#fafafa',
  text:      '#18181b', textMuted: '#71717a',
  primary:   '#18181b', success: '#16a34a', error: '#dc2626',
}

// ─── shared components ─────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{children}</div>
}

function Input({ value, onChange, placeholder, disabled }: { value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ width: '100%', padding: '7px 9px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg, color: C.text, boxSizing: 'border-box' }} />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3, disabled }: { value: string; onChange?: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean }) {
  return (
    <textarea value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled}
      style={{ width: '100%', padding: '7px 9px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg, color: C.text, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
  )
}

function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ width: '100%', padding: '7px 9px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg, color: C.text, boxSizing: 'border-box' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'outline' | 'ghost'; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? '5px 10px' : '8px 16px'
  const fs = size === 'sm' ? 12 : 13
  const s: React.CSSProperties = variant === 'primary' ? { background: C.primary, color: '#fff', border: `1px solid ${C.primary}` }
    : variant === 'outline' ? { background: C.bg, color: C.text, border: `1px solid ${C.border}` }
    : { background: 'transparent', color: C.textMuted, border: '1px solid transparent' }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s, padding: pad, fontSize: fs, fontWeight: 500, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {children}
    </button>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, ...style }}>{children}</div>
}

function SectionHeader({ title, count, hint }: { title: string; count?: number; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 11, padding: '2px 7px', background: '#f4f4f5', borderRadius: 10, color: C.textMuted }}>{count}</span>}
      {hint && <span style={{ fontSize: 12, color: C.textMuted }}>{hint}</span>}
    </div>
  )
}

// ─── step bar ─────────────────────────────────────────────────
const STEPS = ['基础信息', '内容来源', 'AI 分析', '确认方案']
function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: i <= current ? C.primary : C.bgSubtle, color: i <= current ? '#fff' : C.textMuted, border: `1px solid ${i <= current ? C.primary : C.border}` }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === current ? C.text : C.textMuted, whiteSpace: 'nowrap', fontWeight: i === current ? 600 : 400 }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < current ? C.primary : C.border, margin: '0 8px', marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────
function Step1({ info, onChange }: { info: InitBasicInfo; onChange: (v: InitBasicInfo) => void }) {
  const set = <K extends keyof InitBasicInfo>(k: K, v: InitBasicInfo[K]) => onChange({ ...info, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><Label>网站名称 *</Label><Input value={info.siteName} onChange={v => set('siteName', v)} placeholder="例：上海美华医院" /></div>
        <div><Label>主要语言 *</Label><Select value={info.language} onChange={v => set('language', v as InitBasicInfo['language'])} options={[{ value: 'zh', label: '中文' }, { value: 'en', label: '英文' }, { value: 'bilingual', label: '中英双语' }]} /></div>
        <div><Label>网站类型 *</Label><Select value={info.siteType} onChange={v => set('siteType', v as InitBasicInfo['siteType'])} options={[{ value: 'showcase', label: '展示型' }, { value: 'marketing', label: '营销型' }, { value: 'news', label: '资讯型' }, { value: 'ecommerce', label: '电商型' }]} /></div>
        <div><Label>行业 *</Label><Input value={info.industry} onChange={v => set('industry', v)} placeholder="例：医疗健康 / 教育 / 餐饮" /></div>
      </div>
      <div><Label>目标受众 *</Label><Input value={info.targetAudience} onChange={v => set('targetAudience', v)} placeholder="例：25-45岁有育儿需求的家长" /></div>
      <div><Label>品牌色（选填）</Label><Input value={info.brandColor ?? ''} onChange={v => set('brandColor', v)} placeholder="例：#2563eb" /></div>
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────
function Step2({ contentSourceUrl, styleReferenceUrl, onChange }: { contentSourceUrl: string; styleReferenceUrl: string; onChange: (k: 'contentSourceUrl' | 'styleReferenceUrl', v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Label>内容来源网站 *</Label>
        <Input value={contentSourceUrl} onChange={v => onChange('contentSourceUrl', v)} placeholder="https://example.com" />
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>AI 将抓取该网站的联系信息、团队成员、服务项目、案例等结构化内容</div>
      </div>
      <div>
        <Label>样式参考网站（选填）</Label>
        <Input value={styleReferenceUrl} onChange={v => onChange('styleReferenceUrl', v)} placeholder="https://reference-site.com" />
      </div>
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────
function Step3({ status, log }: { status: 'idle' | 'running' | 'done' | 'error'; log: string[] }) {
  return (
    <div>
      {status === 'idle' && <div style={{ color: C.textMuted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>准备就绪，点击「开始分析」</div>}
      {status !== 'idle' && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontFamily: 'monospace', lineHeight: 1.9 }}>
            {log.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('[错误]') ? '#f87171' : line.startsWith('[完成]') ? '#4ade80' : line.startsWith('[抓取]') ? '#60a5fa' : '#94a3b8' }}>{line}</div>
            ))}
            {status === 'running' && <div style={{ color: '#60a5fa' }}>▌</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 4 helpers ───────────────────────────────────────────
function PlanSection({ title, count, children, defaultOpen = true }: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.bgSubtle, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.text }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {count !== undefined && <span style={{ fontSize: 11, padding: '1px 7px', background: '#e4e4e7', borderRadius: 10, fontWeight: 400, color: C.textMuted }}>{count} 项</span>}
        </span>
        <span style={{ color: C.textMuted, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
    </div>
  )
}

function ContactSection({ info, onChange, disabled }: { info: InitPlan['contactInfo']; onChange: (v: InitPlan['contactInfo']) => void; disabled: boolean }) {
  const set = (k: keyof typeof info, v: string) => onChange({ ...info, [k]: v })
  return (
    <PlanSection title="联系信息">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><Label>电话</Label><Input value={info.phone ?? ''} onChange={v => set('phone', v)} placeholder="未提取到" disabled={disabled} /></div>
        <div><Label>邮箱</Label><Input value={info.email ?? ''} onChange={v => set('email', v)} placeholder="未提取到" disabled={disabled} /></div>
        <div><Label>地址</Label><Input value={info.address ?? ''} onChange={v => set('address', v)} placeholder="未提取到" disabled={disabled} /></div>
        <div><Label>营业时间</Label><Input value={info.hours ?? ''} onChange={v => set('hours', v)} placeholder="未提取到" disabled={disabled} /></div>
      </div>
    </PlanSection>
  )
}

function AboutSection({ page, onChange, disabled }: { page?: InitPlan['aboutPage']; onChange: (v: InitPlan['aboutPage']) => void; disabled: boolean }) {
  return (
    <PlanSection title="机构介绍" count={page?.content ? 1 : 0}>
      {page?.content
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><Label>标题</Label><Input value={page.title} onChange={v => onChange({ ...page, title: v })} disabled={disabled} /></div>
            <div><Label>内容</Label><Textarea value={page.content} onChange={v => onChange({ ...page, content: v })} rows={5} disabled={disabled} /></div>
          </div>
        : <div style={{ fontSize: 13, color: C.textMuted, padding: '8px 0' }}>未从来源网站提取到机构介绍内容</div>
      }
    </PlanSection>
  )
}

function TeamSection({ members, onChange, disabled }: { members: InitTeamMember[]; onChange: (v: InitTeamMember[]) => void; disabled: boolean }) {
  return (
    <PlanSection title="团队成员" count={members.length} defaultOpen={members.length > 0}>
      {members.length === 0
        ? <div style={{ fontSize: 13, color: C.textMuted, padding: '8px 0' }}>未从来源网站提取到团队成员信息</div>
        : members.map((m, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {m.imageUrl && (
                  <img src={m.imageUrl} alt={m.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: `1px solid ${C.border}` }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><Label>姓名</Label><Input value={m.name} onChange={v => { const a = [...members]; a[i] = { ...a[i], name: v }; onChange(a) }} disabled={disabled} /></div>
                    <div><Label>职称</Label><Input value={m.title} onChange={v => { const a = [...members]; a[i] = { ...a[i], title: v }; onChange(a) }} disabled={disabled} /></div>
                  </div>
                  {m.imageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <Label>照片 URL</Label>
                      <Input value={m.imageUrl} onChange={v => { const a = [...members]; a[i] = { ...a[i], imageUrl: v }; onChange(a) }} disabled={disabled} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 8 }}><Label>简介</Label><Textarea value={m.bio} onChange={v => { const a = [...members]; a[i] = { ...a[i], bio: v }; onChange(a) }} rows={4} disabled={disabled} /></div>
            </Card>
          ))
      }
    </PlanSection>
  )
}

function ServiceSection({ services, onChange, disabled }: { services: InitService[]; onChange: (v: InitService[]) => void; disabled: boolean }) {
  return (
    <PlanSection title="服务项目" count={services.length} defaultOpen={services.length > 0}>
      {services.length === 0
        ? <div style={{ fontSize: 13, color: C.textMuted, padding: '8px 0' }}>未从来源网站提取到服务项目</div>
        : services.map((s, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, marginBottom: 8 }}>
                <div><Label>服务名称</Label><Input value={s.name} onChange={v => { const a = [...services]; a[i] = { ...a[i], name: v }; onChange(a) }} disabled={disabled} /></div>
                <div><Label>Slug</Label><Input value={s.slug} onChange={v => { const a = [...services]; a[i] = { ...a[i], slug: v }; onChange(a) }} disabled={disabled} /></div>
              </div>
              <div><Label>描述</Label><Textarea value={s.description} onChange={v => { const a = [...services]; a[i] = { ...a[i], description: v }; onChange(a) }} rows={2} disabled={disabled} /></div>
            </Card>
          ))
      }
    </PlanSection>
  )
}

function CaseSection({ cases, onChange, disabled }: { cases: InitCase[]; onChange: (v: InitCase[]) => void; disabled: boolean }) {
  return (
    <PlanSection title="成功案例" count={cases.length} defaultOpen={cases.length > 0}>
      {cases.length === 0
        ? <div style={{ fontSize: 13, color: C.textMuted, padding: '8px 0' }}>未从来源网站提取到案例</div>
        : cases.map((c, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ marginBottom: 8 }}><Label>标题</Label><Input value={c.title} onChange={v => { const a = [...cases]; a[i] = { ...a[i], title: v }; onChange(a) }} disabled={disabled} /></div>
              <div style={{ marginBottom: 8 }}><Label>描述</Label><Textarea value={c.description} onChange={v => { const a = [...cases]; a[i] = { ...a[i], description: v }; onChange(a) }} rows={2} disabled={disabled} /></div>
              <div><Label>结果/成效</Label><Input value={c.outcome ?? ''} onChange={v => { const a = [...cases]; a[i] = { ...a[i], outcome: v }; onChange(a) }} placeholder="选填" disabled={disabled} /></div>
            </Card>
          ))
      }
    </PlanSection>
  )
}

// ─── Step 4 main ──────────────────────────────────────────────
function Step4({ plan, onChange, executing, done, execResult }: {
  plan: InitPlan; onChange: (p: InitPlan) => void; executing: boolean; done: boolean
  execResult: { categoriesCreated: number; contentsImported: number; errors: string[] } | null
}) {
  const upd = <K extends keyof InitPlan>(k: K, v: InitPlan[K]) => onChange({ ...plan, [k]: v })

  if (done && execResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.success }}>初始化完成</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            已创建 {execResult.categoriesCreated} 个分类，导入 {execResult.contentsImported} 篇内容
          </div>
          {execResult.errors.length > 0 && (
            <details style={{ marginTop: 10, textAlign: 'left' }}>
              <summary style={{ fontSize: 12, color: C.error, cursor: 'pointer' }}>{execResult.errors.length} 项出错（展开查看）</summary>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.error, marginTop: 6, lineHeight: 1.8 }}>
                {execResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </details>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['查看文章', '/admin/post'], ['查看分类', '/admin/categories'], ['查看页面', '/admin/page'], ['系统设置', '/admin/settings']].map(([label, href]) => (
            <a key={href} href={href} style={{ textDecoration: 'none' }}>
              <Btn variant={label === '查看文章' ? 'primary' : 'outline'}>{label}</Btn>
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      {plan.summary && (
        <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
          {plan.summary}
        </div>
      )}

      {/* 基础设置 */}
      <PlanSection title="基础设置">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><Label>网站名称</Label><Input value={plan.siteSettings.name} onChange={v => upd('siteSettings', { ...plan.siteSettings, name: v })} disabled={executing} /></div>
          <div><Label>网站简介</Label><Input value={plan.siteSettings.description} onChange={v => upd('siteSettings', { ...plan.siteSettings, description: v })} disabled={executing} /></div>
        </div>
      </PlanSection>

      {/* 联系信息 */}
      <ContactSection info={plan.contactInfo} onChange={v => upd('contactInfo', v)} disabled={executing} />

      {/* 机构介绍 */}
      <AboutSection page={plan.aboutPage} onChange={v => upd('aboutPage', v)} disabled={executing} />

      {/* 团队成员 */}
      <TeamSection members={plan.teamMembers} onChange={v => upd('teamMembers', v)} disabled={executing} />

      {/* 服务项目 */}
      <ServiceSection services={plan.services} onChange={v => upd('services', v)} disabled={executing} />

      {/* 成功案例 */}
      <CaseSection cases={plan.cases} onChange={v => upd('cases', v)} disabled={executing} />

      {/* 内容分类 */}
      <PlanSection title="内容分类" count={plan.categories.length} defaultOpen={false}>
        {plan.categories.map((cat, i) => (
          <Card key={i} style={{ padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 1fr', gap: 8 }}>
              <div><Label>名称</Label><Input value={cat.name} onChange={v => { const a = [...plan.categories]; a[i] = { ...a[i], name: v }; upd('categories', a) }} disabled={executing} /></div>
              <div><Label>Slug</Label><Input value={cat.slug} onChange={v => { const a = [...plan.categories]; a[i] = { ...a[i], slug: v }; upd('categories', a) }} disabled={executing} /></div>
              <div><Label>描述</Label><Input value={cat.description ?? ''} onChange={v => { const a = [...plan.categories]; a[i] = { ...a[i], description: v }; upd('categories', a) }} disabled={executing} /></div>
            </div>
          </Card>
        ))}
      </PlanSection>

      {/* 导航 */}
      <PlanSection title="主导航" count={plan.navigation.length} defaultOpen={false}>
        {plan.navigation.map((nav, i) => (
          <Card key={i} style={{ padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><Label>名称</Label><Input value={nav.label} onChange={v => { const a = [...plan.navigation]; a[i] = { ...a[i], label: v }; upd('navigation', a) }} disabled={executing} /></div>
              <div><Label>链接</Label><Input value={nav.url} onChange={v => { const a = [...plan.navigation]; a[i] = { ...a[i], url: v }; upd('navigation', a) }} disabled={executing} /></div>
            </div>
          </Card>
        ))}
      </PlanSection>

      {/* AI 配置 */}
      <PlanSection title="AI 内容配置" defaultOpen={false}>
        <div><Label>内容话题方向</Label><Textarea value={plan.aiConfig.siteTopics} onChange={v => upd('aiConfig', { ...plan.aiConfig, siteTopics: v })} rows={2} disabled={executing} /></div>
        <div><Label>目标受众</Label><Input value={plan.aiConfig.targetAudience} onChange={v => upd('aiConfig', { ...plan.aiConfig, targetAudience: v })} disabled={executing} /></div>
        <div><Label>写作风格</Label><Input value={plan.aiConfig.writingStyle} onChange={v => upd('aiConfig', { ...plan.aiConfig, writingStyle: v })} disabled={executing} /></div>
      </PlanSection>

      {/* 导入内容 */}
      <PlanSection title="导入文章" count={plan.importItems.length} defaultOpen={false}>
        {plan.importItems.length === 0
          ? <div style={{ fontSize: 13, color: C.textMuted }}>AI 未生成示例文章<span style={{ color: C.error, marginLeft: 6 }}>（初始化后可手动添加）</span></div>
          : plan.importItems.map((item, i) => (
              <Card key={i} style={{ padding: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 8, marginBottom: 6 }}>
                  <div><Label>标题</Label><Input value={item.title} onChange={v => { const a = [...plan.importItems]; a[i] = { ...a[i], title: v }; upd('importItems', a) }} disabled={executing} /></div>
                  <div><Label>分类</Label><Input value={item.categorySlug ?? ''} onChange={v => { const a = [...plan.importItems]; a[i] = { ...a[i], categorySlug: v }; upd('importItems', a) }} disabled={executing} /></div>
                </div>
                <div><Label>摘要</Label><Input value={item.excerpt} onChange={v => { const a = [...plan.importItems]; a[i] = { ...a[i], excerpt: v }; upd('importItems', a) }} disabled={executing} /></div>
              </Card>
            ))
        }
      </PlanSection>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────
const DEFAULT_INFO: InitBasicInfo = { siteName: '', language: 'zh', siteType: 'showcase', industry: '', targetAudience: '', brandColor: '' }

export default function InitWizard() {
  const saved = loadSaved()
  const [step, setStep] = useState(saved.step ?? 0)
  const [basicInfo, setBasicInfo] = useState<InitBasicInfo>(saved.basicInfo ?? DEFAULT_INFO)
  const [contentSourceUrl, setContentSourceUrl] = useState(saved.contentSourceUrl ?? '')
  const [styleReferenceUrl, setStyleReferenceUrl] = useState(saved.styleReferenceUrl ?? '')
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'running' | 'done' | 'error'>(saved.plan ? 'done' : 'idle')
  const [analyzeLog, setAnalyzeLog] = useState<string[]>(saved.plan ? ['[已恢复] 上次分析结果已加载，可直接下一步或重新分析'] : [])
  const [plan, setPlan] = useState<InitPlan | null>(saved.plan ?? null)
  const [executing, setExecuting] = useState(false)
  const [execDone, setExecDone] = useState(false)
  const [execResult, setExecResult] = useState<{ categoriesCreated: number; contentsImported: number; errors: string[] } | null>(null)

  // 自动保存草稿
  useEffect(() => {
    saveDraft({ step, basicInfo, contentSourceUrl, styleReferenceUrl, plan })
  }, [step, basicInfo, contentSourceUrl, styleReferenceUrl, plan])

  function addLog(line: string) { setAnalyzeLog(prev => [...prev, line]) }

  function resetAll() {
    clearDraft()
    setStep(0)
    setBasicInfo(DEFAULT_INFO)
    setContentSourceUrl('')
    setStyleReferenceUrl('')
    setAnalyzeStatus('idle')
    setAnalyzeLog([])
    setPlan(null)
    setExecDone(false)
    setExecResult(null)
  }

  function canProceed() {
    if (step === 0) return Boolean(basicInfo.siteName && basicInfo.industry && basicInfo.targetAudience)
    if (step === 1) return Boolean(contentSourceUrl)
    if (step === 2) return analyzeStatus === 'done' && Boolean(plan)
    return false
  }

  async function startAnalysis() {
    setAnalyzeStatus('running')
    setAnalyzeLog([])
    addLog(`[开始] 正在连接 AI 分析服务...`)
    addLog(`[抓取] 正在抓取来源网站：${contentSourceUrl}`)
    addLog(`[分析] 智能识别联系页、团队页、服务页、案例页...`)
    try {
      const resp = await fetch('/api/agents/init/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basicInfo, contentSourceUrl, styleReferenceUrl: styleReferenceUrl || undefined }),
      })
      const data = await resp.json() as { ok: boolean; plan?: InitPlan; error?: string }
      if (!data.ok || !data.plan) {
        addLog(`[错误] ${data.error || '分析失败'}`)
        setAnalyzeStatus('error')
        return
      }
      const p = data.plan
      addLog(`[完成] 分析完成`)
      if (p.contactInfo?.phone || p.contactInfo?.address) addLog(`  · 联系信息：已提取`)
      if (p.aboutPage?.content) addLog(`  · 机构介绍：已提取`)
      if (p.teamMembers?.length) addLog(`  · 团队成员：${p.teamMembers.length} 人`)
      if (p.services?.length) addLog(`  · 服务项目：${p.services.length} 项`)
      if (p.cases?.length) addLog(`  · 成功案例：${p.cases.length} 个`)
      if (p.categories?.length) addLog(`  · 内容分类：${p.categories.length} 个`)
      if (p.importItems?.length) addLog(`  · 导入文章：${p.importItems.length} 篇`)
      setPlan(p)
      setAnalyzeStatus('done')
    } catch (err) {
      addLog(`[错误] ${String(err)}`)
      setAnalyzeStatus('error')
    }
  }

  async function execute() {
    if (!plan) return
    setExecuting(true)
    try {
      const resp = await fetch('/api/agents/init/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await resp.json() as { ok: boolean; categoriesCreated?: number; contentsImported?: number; errors?: string[]; error?: string }
      if (!data.ok) { alert(data.error || '执行失败'); return }
      setExecResult({ categoriesCreated: data.categoriesCreated ?? 0, contentsImported: data.contentsImported ?? 0, errors: data.errors ?? [] })
      setExecDone(true)
      clearDraft()
    } catch (err) {
      alert(String(err))
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div>
      <StepBar current={step} />
      <Card>
        {step === 0 && <Step1 info={basicInfo} onChange={setBasicInfo} />}
        {step === 1 && <Step2 contentSourceUrl={contentSourceUrl} styleReferenceUrl={styleReferenceUrl} onChange={(k, v) => k === 'contentSourceUrl' ? setContentSourceUrl(v) : setStyleReferenceUrl(v)} />}
        {step === 2 && <Step3 status={analyzeStatus} log={analyzeLog} />}
        {step === 3 && plan && <Step4 plan={plan} onChange={setPlan} executing={executing} done={execDone} execResult={execResult} />}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && !execDone && <Btn variant="outline" onClick={() => setStep(s => s - 1)} disabled={executing || analyzeStatus === 'running'}>上一步</Btn>}
          {!execDone && <Btn variant="ghost" onClick={() => { if (confirm('清除所有已填信息重新开始？')) resetAll() }}>重置</Btn>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step === 2 && analyzeStatus !== 'done' && (
            <Btn onClick={startAnalysis} disabled={analyzeStatus === 'running'}>
              {analyzeStatus === 'running' ? '分析中...' : analyzeStatus === 'error' ? '重新分析' : '开始分析'}
            </Btn>
          )}
          {step === 2 && analyzeStatus === 'done' && (
            <Btn variant="outline" onClick={() => { setAnalyzeStatus('idle'); setAnalyzeLog([]); setPlan(null) }} disabled={analyzeStatus === 'running'}>重新抓取</Btn>
          )}
          {step < 3 && !(step === 2 && analyzeStatus !== 'done') && (
            <Btn onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>下一步</Btn>
          )}
          {step === 3 && !execDone && (
            <Btn onClick={execute} disabled={executing || !plan}>
              {executing ? '初始化中...' : '开始初始化'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

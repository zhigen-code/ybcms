'use client'

import { useState } from 'react'
import type { InitBasicInfo, InitPlan } from '@/types'

// ─── design tokens ────────────────────────────────────────────
const C = {
  border:      '#e4e4e7',
  borderHover: '#a1a1aa',
  bg:          '#ffffff',
  bgSubtle:    '#fafafa',
  text:        '#18181b',
  textMuted:   '#71717a',
  primary:     '#18181b',
  primaryHover:'#27272a',
  success:     '#16a34a',
  error:       '#dc2626',
  blue:        '#2563eb',
}

// ─── tiny shared components ────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${C.border}`,
        borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg,
        color: C.text, boxSizing: 'border-box',
      }}
    />
  )
}

function Select({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${C.border}`,
        borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg,
        color: C.text, boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows = 3, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${C.border}`,
        borderRadius: 6, outline: 'none', background: disabled ? C.bgSubtle : C.bg,
        color: C.text, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit',
      }}
    />
  )
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'primary' | 'outline' | 'ghost'; size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? '6px 12px' : '9px 18px'
  const fs = size === 'sm' ? 12 : 13
  const styles: React.CSSProperties = variant === 'primary'
    ? { background: C.primary, color: '#fff', border: `1px solid ${C.primary}` }
    : variant === 'outline'
    ? { background: C.bg, color: C.text, border: `1px solid ${C.border}` }
    : { background: 'transparent', color: C.textMuted, border: '1px solid transparent' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles, padding: pad, fontSize: fs, fontWeight: 500, borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── step indicator ────────────────────────────────────────────
const STEPS = ['基础信息', '内容来源', 'AI 分析', '确认方案']

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              background: i < current ? C.primary : i === current ? C.primary : C.bgSubtle,
              color: i <= current ? '#fff' : C.textMuted,
              border: `1px solid ${i < current ? C.primary : i === current ? C.primary : C.border}`,
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === current ? C.text : C.textMuted, whiteSpace: 'nowrap', fontWeight: i === current ? 600 : 400 }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < current ? C.primary : C.border, margin: '0 8px', marginBottom: 18 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: 基础信息 ──────────────────────────────────────────
function Step1({ info, onChange }: { info: InitBasicInfo; onChange: (v: InitBasicInfo) => void }) {
  const set = <K extends keyof InitBasicInfo>(k: K, v: InitBasicInfo[K]) => onChange({ ...info, [k]: v })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Label>网站名称 *</Label>
          <Input value={info.siteName} onChange={v => set('siteName', v)} placeholder="例：上海美华医院" />
        </div>
        <div>
          <Label>主要语言 *</Label>
          <Select value={info.language} onChange={v => set('language', v as InitBasicInfo['language'])} options={[
            { value: 'zh', label: '中文' },
            { value: 'en', label: '英文' },
            { value: 'bilingual', label: '中英双语' },
          ]} />
        </div>
        <div>
          <Label>网站类型 *</Label>
          <Select value={info.siteType} onChange={v => set('siteType', v as InitBasicInfo['siteType'])} options={[
            { value: 'showcase', label: '展示型' },
            { value: 'marketing', label: '营销型' },
            { value: 'news', label: '资讯型' },
            { value: 'ecommerce', label: '电商型' },
          ]} />
        </div>
        <div>
          <Label>行业 *</Label>
          <Input value={info.industry} onChange={v => set('industry', v)} placeholder="例：医疗健康 / 教育 / 餐饮" />
        </div>
      </div>
      <div>
        <Label>目标受众 *</Label>
        <Input value={info.targetAudience} onChange={v => set('targetAudience', v)} placeholder="例：25-45岁有育儿需求的家长" />
      </div>
      <div>
        <Label>品牌色（选填）</Label>
        <Input value={info.brandColor ?? ''} onChange={v => set('brandColor', v)} placeholder="例：#2563eb" />
      </div>
    </div>
  )
}

// ─── Step 2: 内容来源 ─────────────────────────────────────────
function Step2({ contentSourceUrl, styleReferenceUrl, onChange }: {
  contentSourceUrl: string; styleReferenceUrl: string
  onChange: (k: 'contentSourceUrl' | 'styleReferenceUrl', v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>内容来源网站 *</Label>
        <Input value={contentSourceUrl} onChange={v => onChange('contentSourceUrl', v)} placeholder="https://example.com" />
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
          AI 将抓取该网站的内容结构和文章，分析适合的分类和内容方向
        </div>
      </div>
      <div>
        <Label>样式参考网站（选填）</Label>
        <Input value={styleReferenceUrl} onChange={v => onChange('styleReferenceUrl', v)} placeholder="https://reference-site.com" />
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
          参考该网站的导航结构和内容组织方式
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: AI 分析 ──────────────────────────────────────────
function Step3({ status, log }: { status: 'idle' | 'running' | 'done' | 'error'; log: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {status === 'idle' && (
        <div style={{ color: C.textMuted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          准备就绪，点击「开始分析」
        </div>
      )}
      {(status === 'running' || status === 'done' || status === 'error') && (
        <Card style={{ background: '#0f172a', borderColor: '#1e293b' }}>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', lineHeight: 1.8 }}>
            {log.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('[错误]') ? '#f87171' : line.startsWith('[完成]') ? '#4ade80' : '#94a3b8' }}>
                {line}
              </div>
            ))}
            {status === 'running' && (
              <div style={{ color: '#60a5fa' }}>▌</div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Step 4: 确认方案 ─────────────────────────────────────────
function Step4({ plan, onChange, executing, done, execResult }: {
  plan: InitPlan
  onChange: (p: InitPlan) => void
  executing: boolean
  done: boolean
  execResult: { categoriesCreated: number; contentsImported: number; errors: string[] } | null
}) {
  const setPlanField = <K extends keyof InitPlan>(k: K, v: InitPlan[K]) => onChange({ ...plan, [k]: v })

  if (done && execResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '20px', background: '#f0fdf4', border: `1px solid #bbf7d0`, borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.success }}>初始化完成</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            已创建 {execResult.categoriesCreated} 个分类，导入 {execResult.contentsImported} 篇内容
          </div>
          {execResult.errors.length > 0 && (
            <details style={{ marginTop: 8, textAlign: 'left' }}>
              <summary style={{ fontSize: 12, color: C.error, cursor: 'pointer' }}>
                {execResult.errors.length} 项出错（点击展开）
              </summary>
              <div style={{ fontSize: 11, color: C.error, marginTop: 6, lineHeight: 1.7, fontFamily: 'monospace' }}>
                {execResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </details>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/post" style={{ textDecoration: 'none' }}>
            <Btn variant="primary">查看文章</Btn>
          </a>
          <a href="/admin/categories" style={{ textDecoration: 'none' }}>
            <Btn variant="outline">查看分类</Btn>
          </a>
          <a href="/admin/settings" style={{ textDecoration: 'none' }}>
            <Btn variant="outline">查看设置</Btn>
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <Card style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>{plan.summary}</div>
      </Card>

      {/* Site settings */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>基础设置</div>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>网站名称</Label>
              <Input value={plan.siteSettings.name} onChange={v => setPlanField('siteSettings', { ...plan.siteSettings, name: v })} disabled={executing} />
            </div>
            <div>
              <Label>网站简介</Label>
              <Input value={plan.siteSettings.description} onChange={v => setPlanField('siteSettings', { ...plan.siteSettings, description: v })} disabled={executing} />
            </div>
          </div>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>分类（{plan.categories.length} 个）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.categories.map((cat, i) => (
            <Card key={i} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: 10, alignItems: 'center' }}>
                <div>
                  <Label>名称</Label>
                  <Input value={cat.name} onChange={v => {
                    const cats = [...plan.categories]; cats[i] = { ...cats[i], name: v }; setPlanField('categories', cats)
                  }} disabled={executing} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={cat.slug} onChange={v => {
                    const cats = [...plan.categories]; cats[i] = { ...cats[i], slug: v }; setPlanField('categories', cats)
                  }} disabled={executing} />
                </div>
                <div>
                  <Label>描述</Label>
                  <Input value={cat.description ?? ''} onChange={v => {
                    const cats = [...plan.categories]; cats[i] = { ...cats[i], description: v }; setPlanField('categories', cats)
                  }} disabled={executing} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>导航（{plan.navigation.length} 项）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.navigation.map((nav, i) => (
            <Card key={i} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <Label>名称</Label>
                  <Input value={nav.label} onChange={v => {
                    const navs = [...plan.navigation]; navs[i] = { ...navs[i], label: v }; setPlanField('navigation', navs)
                  }} disabled={executing} />
                </div>
                <div>
                  <Label>链接</Label>
                  <Input value={nav.url} onChange={v => {
                    const navs = [...plan.navigation]; navs[i] = { ...navs[i], url: v }; setPlanField('navigation', navs)
                  }} disabled={executing} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Config */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>AI 内容配置</div>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label>内容话题方向</Label>
              <Textarea value={plan.aiConfig.siteTopics} onChange={v => setPlanField('aiConfig', { ...plan.aiConfig, siteTopics: v })} rows={2} disabled={executing} />
            </div>
            <div>
              <Label>目标受众</Label>
              <Input value={plan.aiConfig.targetAudience} onChange={v => setPlanField('aiConfig', { ...plan.aiConfig, targetAudience: v })} disabled={executing} />
            </div>
            <div>
              <Label>写作风格</Label>
              <Input value={plan.aiConfig.writingStyle} onChange={v => setPlanField('aiConfig', { ...plan.aiConfig, writingStyle: v })} disabled={executing} />
            </div>
          </div>
        </Card>
      </div>

      {/* Import items */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          导入内容（{plan.importItems.length} 篇）
          {plan.importItems.length === 0 && (
            <span style={{ fontSize: 12, fontWeight: 400, color: C.error, marginLeft: 8 }}>AI 未生成示例内容，初始化后可手动添加</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.importItems.map((item, i) => (
            <Card key={i} style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 }}>
                  <div>
                    <Label>标题</Label>
                    <Input value={item.title} onChange={v => {
                      const items = [...plan.importItems]; items[i] = { ...items[i], title: v }; setPlanField('importItems', items)
                    }} disabled={executing} />
                  </div>
                  <div>
                    <Label>分类</Label>
                    <Input value={item.categorySlug ?? ''} onChange={v => {
                      const items = [...plan.importItems]; items[i] = { ...items[i], categorySlug: v }; setPlanField('importItems', items)
                    }} disabled={executing} />
                  </div>
                </div>
                <div>
                  <Label>摘要</Label>
                  <Input value={item.excerpt} onChange={v => {
                    const items = [...plan.importItems]; items[i] = { ...items[i], excerpt: v }; setPlanField('importItems', items)
                  }} disabled={executing} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main wizard ──────────────────────────────────────────────
const DEFAULT_INFO: InitBasicInfo = {
  siteName: '',
  language: 'zh',
  siteType: 'showcase',
  industry: '',
  targetAudience: '',
  brandColor: '',
}

export default function InitWizard() {
  const [step, setStep] = useState(0)
  const [basicInfo, setBasicInfo] = useState<InitBasicInfo>(DEFAULT_INFO)
  const [contentSourceUrl, setContentSourceUrl] = useState('')
  const [styleReferenceUrl, setStyleReferenceUrl] = useState('')
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [analyzeLog, setAnalyzeLog] = useState<string[]>([])
  const [plan, setPlan] = useState<InitPlan | null>(null)
  const [executing, setExecuting] = useState(false)
  const [execDone, setExecDone] = useState(false)
  const [execResult, setExecResult] = useState<{ categoriesCreated: number; contentsImported: number; errors: string[] } | null>(null)

  function addLog(line: string) {
    setAnalyzeLog(prev => [...prev, line])
  }

  function canProceed(): boolean {
    if (step === 0) return Boolean(basicInfo.siteName && basicInfo.industry && basicInfo.targetAudience)
    if (step === 1) return Boolean(contentSourceUrl)
    if (step === 2) return analyzeStatus === 'done' && Boolean(plan)
    return false
  }

  async function startAnalysis() {
    setAnalyzeStatus('running')
    setAnalyzeLog([])
    addLog('[开始] 正在连接 AI 分析服务...')
    addLog(`[抓取] 正在抓取来源网站：${contentSourceUrl}`)
    try {
      const resp = await fetch('/api/agents/init/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicInfo,
          contentSourceUrl,
          styleReferenceUrl: styleReferenceUrl || undefined,
        }),
      })
      const data = await resp.json() as { ok: boolean; plan?: InitPlan; error?: string }
      if (!data.ok || !data.plan) {
        addLog(`[错误] ${data.error || '分析失败'}`)
        setAnalyzeStatus('error')
        return
      }
      setPlan(data.plan)
      addLog(`[完成] 分析完成，生成了 ${data.plan.categories.length} 个分类、${data.plan.importItems.length} 篇内容`)
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
      if (!data.ok) {
        alert(data.error || '执行失败')
        return
      }
      setExecResult({
        categoriesCreated: data.categoriesCreated ?? 0,
        contentsImported: data.contentsImported ?? 0,
        errors: data.errors ?? [],
      })
      setExecDone(true)
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
        {step === 1 && (
          <Step2
            contentSourceUrl={contentSourceUrl}
            styleReferenceUrl={styleReferenceUrl}
            onChange={(k, v) => k === 'contentSourceUrl' ? setContentSourceUrl(v) : setStyleReferenceUrl(v)}
          />
        )}
        {step === 2 && <Step3 status={analyzeStatus} log={analyzeLog} />}
        {step === 3 && plan && (
          <Step4
            plan={plan}
            onChange={setPlan}
            executing={executing}
            done={execDone}
            execResult={execResult}
          />
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div>
          {step > 0 && !execDone && (
            <Btn variant="outline" onClick={() => setStep(s => s - 1)} disabled={executing || analyzeStatus === 'running'}>
              上一步
            </Btn>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {step === 2 && analyzeStatus !== 'done' && (
            <Btn onClick={startAnalysis} disabled={analyzeStatus === 'running'}>
              {analyzeStatus === 'running' ? '分析中...' : analyzeStatus === 'error' ? '重新分析' : '开始分析'}
            </Btn>
          )}
          {step < 3 && !(step === 2 && analyzeStatus !== 'done') && (
            <Btn onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              下一步
            </Btn>
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

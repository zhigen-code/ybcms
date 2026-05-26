'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { AITask, AITaskType, Category, CategoryPlan, SiteSettings } from '@/types'
import { formatDate } from '@/lib/utils'
import { TabBar } from '@/components/TabBar'

// ── 常量 ────────────────────────────────────────────────────────────────

const TEXT_MODELS = [
  { value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B (快速，推荐)' },
  { value: '@cf/meta/llama-3.1-70b-instruct',           label: 'Llama 3.1 70B' },
  { value: '@cf/meta/llama-3.1-8b-instruct',            label: 'Llama 3.1 8B (轻量)' },
  { value: '@cf/meta/llama-3.2-3b-instruct',            label: 'Llama 3.2 3B (极轻量)' },
  { value: '@cf/mistral/mistral-7b-instruct-v0.1',      label: 'Mistral 7B' },
  { value: '@cf/qwen/qwen1.5-14b-chat-awq',             label: 'Qwen 1.5 14B' },
  { value: '@cf/qwen/qwen1.5-7b-chat-awq',              label: 'Qwen 1.5 7B' },
]

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: '待执行', bg: 'rgba(113,113,122,0.1)', color: '#71717a' },
  running: { label: '执行中', bg: 'rgba(245,158,11,0.1)',  color: '#d97706' },
  done:    { label: '已完成', bg: 'rgba(16,185,129,0.1)',  color: '#059669' },
  failed:  { label: '失败',   bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
}

const TYPE_LABEL: Record<AITaskType, string> = {
  content:   '内容生成',
  seo:       'SEO 优化',
  design:    '设计',
  analytics: '分析',
  setup:     '初始化',
}

const DEFAULT_TOPIC_PROMPT = `你是一个内容策略师，正在为名为"{{siteName}}"的网站规划内容。
{{siteTopics}}{{audience}}{{avoidTopics}}
已有文章标题（避免重复选题）：
{{existingTitles}}

请建议 {{count}} 个全新的、有吸引力的文章选题。
直接返回 JSON 数组，不要其他内容：["选题1", "选题2", ...]`

const DEFAULT_SYSTEM_PROMPT = `你是一位专业的内容创作者，擅长SEO友好的内容写作。请严格按照指定格式输出。`

const DEFAULT_USER_PROMPT = `请围绕主题"{{topic}}"写一篇{{wordCount}}字左右的文章。
{{keywords}}{{style}}{{siteTopics}}{{audience}}
严格按以下格式输出，不要添加任何其他内容：

===TITLE===
（在此写文章标题，一行）
===EXCERPT===
（在此写100字以内的摘要，一行）
===META===
（在此写SEO描述，一行，100字以内）
===CONTENT===
（在此写Markdown格式正文）
===END===`

// ── Props ───────────────────────────────────────────────────────────────

interface Props {
  initialTasks: AITask[]
  totalTasks: number
  initialSettings: Partial<SiteSettings>
}

// ── 子组件：ModelSelect ─────────────────────────────────────────────────

function ModelSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', display: 'block', marginBottom: '6px' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e4e4e7',
          borderRadius: '8px', background: '#fff', color: '#18181b', outline: 'none', cursor: 'pointer',
        }}
      >
        {TEXT_MODELS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── 子组件：ToggleSwitch ─────────────────────────────────────────────────

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
          background: checked ? '#6366f1' : '#e4e4e7',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
          width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#18181b', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0' }}>{desc}</p>}
      </div>
    </label>
  )
}

// ── 子组件：FieldLabel ──────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', display: 'block', marginBottom: '6px' }}>
      {children}
      {hint && <span style={{ fontWeight: 400, color: '#a1a1aa', marginLeft: '6px' }}>{hint}</span>}
    </label>
  )
}

// ── 主组件 ──────────────────────────────────────────────────────────────

export default function AIDashboard({ initialTasks, totalTasks, initialSettings }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'schedule' | 'seo' | 'prompts'>('dashboard')

  // Dashboard state
  const [tasks, setTasks] = useState<AITask[]>(initialTasks)
  const [total, setTotal] = useState(totalTasks)
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [lastResult, setLastResult] = useState<Record<string, string>>({})
  const [previewTopics, setPreviewTopics] = useState<string[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Content Agent config state
  const [count, setCount] = useState(Number(initialSettings['ai.content.count']) || 2)
  const [autoPublish, setAutoPublish] = useState(Boolean(initialSettings['ai.content.autoPublish']))
  const [length, setLength] = useState<'short' | 'medium' | 'long'>((initialSettings['ai.content.length'] as 'short' | 'medium' | 'long') || 'medium')
  const [imageSource, setImageSource] = useState<'ai' | 'unsplash' | 'none'>((initialSettings['ai.content.imageSource'] as 'ai' | 'unsplash' | 'none') || 'none')
  const [unsplashKey, setUnsplashKey] = useState(String(initialSettings['ai.content.unsplashKey'] || ''))
  const [bodyImageSource, setBodyImageSource] = useState<'none' | 'unsplash' | 'ai'>((initialSettings['ai.content.bodyImageSource'] as 'none' | 'unsplash' | 'ai') || 'none')
  const [siteTopics, setSiteTopics] = useState(String(initialSettings['ai.content.siteTopics'] || ''))
  const [targetAudience, setTargetAudience] = useState(String(initialSettings['ai.content.targetAudience'] || ''))
  const [avoidTopics, setAvoidTopics] = useState(String(initialSettings['ai.content.avoidTopics'] || ''))
  const [topicModel, setTopicModel] = useState(String(initialSettings['ai.topic.model'] || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'))
  const [contentModel, setContentModel] = useState(String(initialSettings['ai.content.model'] || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'))
  const [categoryPlans, setCategoryPlans] = useState<CategoryPlan[]>((initialSettings['ai.content.categoryPlans'] as CategoryPlan[]) || [])
  const [categories, setCategories] = useState<Category[]>([])

  // SEO Agent config state
  const [batchSize, setBatchSize] = useState(Number(initialSettings['ai.seo.batchSize']) || 8)
  const [priorityAI, setPriorityAI] = useState(Boolean(initialSettings['ai.seo.priorityAI']))
  const [seoModel, setSeoModel] = useState(String(initialSettings['ai.seo.model'] || '@cf/meta/llama-3.1-8b-instruct'))

  // Prompts state
  const [topicPrompt, setTopicPrompt] = useState(String(initialSettings['ai.topic.prompt'] || ''))
  const [systemPrompt, setSystemPrompt] = useState(String(initialSettings['ai.content.systemPrompt'] || ''))
  const [userPrompt, setUserPrompt] = useState(String(initialSettings['ai.content.userPrompt'] || ''))

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(Boolean(initialSettings['ai.schedule.enabled']))
  const [scheduleHours, setScheduleHours] = useState<number[]>((initialSettings['ai.schedule.hours'] as number[]) || [9, 13, 17, 20])
  const [scheduleTz, setScheduleTz] = useState(Number(initialSettings['ai.schedule.timezone'] ?? 8))
  const [scheduleRunMin, setScheduleRunMin] = useState(Number(initialSettings['ai.schedule.runMin'] ?? 1))
  const [scheduleRunMax, setScheduleRunMax] = useState(Number(initialSettings['ai.schedule.runMax'] ?? 1))
  const [scheduleDailyMax, setScheduleDailyMax] = useState(Number(initialSettings['ai.schedule.dailyMax'] ?? 10))

  // Trigger link state
  const [triggerToken, setTriggerToken] = useState(String(initialSettings['ai.trigger.token'] || ''))
  const [tokenSaving, setTokenSaving] = useState(false)
  const [copied, setCopied] = useState<string>('')

  // Saving state
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    fetch('/api/categories?type=post')
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setCategories(d as Category[]) })
      .catch(() => {})
  }, [])

  const refreshTasks = useCallback(async () => {
    const res = await fetch('/api/ai-tasks')
    if (res.ok) {
      const d = await res.json() as { items: AITask[]; pagination: { total: number } }
      setTasks(d.items)
      setTotal(d.pagination.total)
    }
  }, [])

  async function handleRun(agent: 'content' | 'seo') {
    setRunning(r => ({ ...r, [agent]: true }))
    setLastResult(r => ({ ...r, [agent]: '' }))
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      })
      const data = await res.json() as { success?: boolean; summary?: string; error?: string }
      if (!res.ok) {
        setLastResult(r => ({ ...r, [agent]: `失败: ${data.error || res.statusText || '未知错误'}` }))
      } else {
        setLastResult(r => ({ ...r, [agent]: data.summary ?? (data.success ? '完成' : '运行失败') }))
        await refreshTasks()
      }
    } catch (e) {
      setLastResult(r => ({ ...r, [agent]: `请求失败: ${e instanceof Error ? e.message : '网络错误'}` }))
    } finally {
      setRunning(r => ({ ...r, [agent]: false }))
    }
  }

  async function handleGenerateToken() {
    setTokenSaving(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'ai.trigger.token': token }),
      })
      if (res.ok) setTriggerToken(token)
    } finally { setTokenSaving(false) }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  function buildTriggerUrl(agent: 'content' | 'seo') {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/api/agents/trigger?token=${triggerToken}&agent=${agent}`
  }

  async function handlePreviewTopics() {
    setPreviewLoading(true)
    setPreviewTopics([])
    try {
      const res = await fetch('/api/agents/preview-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Math.min(count, 10) }),
      })
      const data = await res.json() as { topics?: string[]; error?: string }
      if (data.topics) setPreviewTopics(data.topics)
      else setLastResult(r => ({ ...r, preview: data.error || '生成失败' }))
    } catch {
      setLastResult(r => ({ ...r, preview: '请求失败，请重试' }))
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      const patch: Record<string, unknown> = {
        'ai.content.count': count,
        'ai.content.autoPublish': autoPublish,
        'ai.content.length': length,
        'ai.content.imageSource': imageSource,
        'ai.content.unsplashKey': unsplashKey,
        'ai.content.bodyImageSource': bodyImageSource,
        'ai.content.siteTopics': siteTopics,
        'ai.content.targetAudience': targetAudience,
        'ai.content.avoidTopics': avoidTopics,
        'ai.topic.model': topicModel,
        'ai.content.model': contentModel,
        'ai.content.categoryPlans': categoryPlans,
        'ai.seo.batchSize': batchSize,
        'ai.seo.priorityAI': priorityAI,
        'ai.seo.model': seoModel,
        'ai.topic.prompt': topicPrompt,
        'ai.content.systemPrompt': systemPrompt,
        'ai.content.userPrompt': userPrompt,
        'ai.schedule.enabled': scheduleEnabled,
        'ai.schedule.hours': scheduleHours,
        'ai.schedule.timezone': scheduleTz,
        'ai.schedule.runMin': scheduleRunMin,
        'ai.schedule.runMax': scheduleRunMax,
        'ai.schedule.dailyMax': scheduleDailyMax,
      }
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) setSaveMsg('保存成功')
      else setSaveMsg('保存失败')
    } catch {
      setSaveMsg('保存失败')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  function addCategoryPlan(categoryId: string) {
    if (categoryPlans.find(p => p.categoryId === categoryId)) return
    setCategoryPlans(prev => [...prev, { categoryId, count: 2, topicFocus: '', weight: 1 }])
  }

  function removeCategoryPlan(categoryId: string) {
    setCategoryPlans(prev => prev.filter(p => p.categoryId !== categoryId))
  }

  function updateCategoryPlan(categoryId: string, field: 'count' | 'topicFocus' | 'weight', value: string | number) {
    setCategoryPlans(prev => prev.map(p => p.categoryId === categoryId ? { ...p, [field]: value } : p))
  }

  function toggleScheduleHour(h: number) {
    setScheduleHours(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h].sort((a, b) => a - b)
    )
  }

  const cardBase: React.CSSProperties = {
    background: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '20px',
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: '13px',
    border: '1px solid #e4e4e7', borderRadius: '8px',
    background: '#fff', color: '#18181b', outline: 'none',
    boxSizing: 'border-box',
  }

  const tabs = [
    { key: 'dashboard', label: '执行面板' },
    { key: 'content',   label: '内容 Agent' },
    { key: 'schedule',  label: '发布计划' },
    { key: 'seo',       label: 'SEO Agent' },
    { key: 'prompts',   label: '提示词' },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tab bar */}
      <TabBar tabs={tabs} active={activeTab} onChange={k => setActiveTab(k as typeof activeTab)} />

      {/* ── Tab 1: 执行面板 ── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Agent cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Content Agent */}
            <div style={cardBase}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: 0 }}>内容 Agent</p>
                  <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>
                    {scheduleEnabled
                      ? `计划 ${scheduleHours.length} 个时段 · ${scheduleRunMin === scheduleRunMax ? scheduleRunMin : `${scheduleRunMin}–${scheduleRunMax}`} 篇/次 · 上限 ${scheduleDailyMax} 篇/天`
                      : `生成 ${count} 篇 · ${length === 'short' ? '短文' : length === 'long' ? '长文' : '中等'} · ${autoPublish ? '直接发布' : '保存草稿'}`}
                  </p>
                </div>
              </div>

              {lastResult['content'] && (
                <div style={{
                  fontSize: '12px', padding: '7px 10px', borderRadius: '7px', marginBottom: '10px',
                  background: lastResult['content'].includes('失败') ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)',
                  color: lastResult['content'].includes('失败') ? '#ef4444' : '#059669',
                }}>
                  {lastResult['content']}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleRun('content')}
                  disabled={running['content']}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: '13px', fontWeight: 500,
                    border: 'none', borderRadius: '8px', cursor: running['content'] ? 'not-allowed' : 'pointer',
                    background: running['content'] ? '#f4f4f5' : '#6366f1',
                    color: running['content'] ? '#71717a' : '#fff',
                  }}
                >
                  {running['content'] ? '生成中…' : '立即生成'}
                </button>
                <button
                  onClick={handlePreviewTopics}
                  disabled={previewLoading}
                  style={{
                    padding: '8px 14px', fontSize: '13px', fontWeight: 500,
                    border: '1px solid #e4e4e7', borderRadius: '8px', cursor: previewLoading ? 'not-allowed' : 'pointer',
                    background: '#fff', color: '#71717a',
                  }}
                >
                  {previewLoading ? '…' : '预览选题'}
                </button>
              </div>

              {previewTopics.length > 0 && (
                <div style={{ marginTop: '10px', border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', padding: '8px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>预览选题</p>
                  {previewTopics.map((t, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#3f3f46', padding: '5px 10px', borderTop: i > 0 ? '1px solid #f4f4f5' : 'none' }}>
                      {i + 1}. {t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEO Agent */}
            <div style={cardBase}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: 0 }}>SEO Agent</p>
                  <p style={{ fontSize: '12px', color: '#71717a', margin: 0 }}>每批 {batchSize} 篇 · {priorityAI ? '优先AI内容' : '全部文章'}</p>
                </div>
              </div>

              {lastResult['seo'] && (
                <div style={{
                  fontSize: '12px', padding: '7px 10px', borderRadius: '7px', marginBottom: '10px',
                  background: lastResult['seo'].includes('失败') ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)',
                  color: lastResult['seo'].includes('失败') ? '#ef4444' : '#059669',
                }}>
                  {lastResult['seo']}
                </div>
              )}

              <button
                onClick={() => handleRun('seo')}
                disabled={running['seo']}
                style={{
                  width: '100%', padding: '8px 0', fontSize: '13px', fontWeight: 500,
                  border: 'none', borderRadius: '8px', cursor: running['seo'] ? 'not-allowed' : 'pointer',
                  background: running['seo'] ? '#f4f4f5' : '#0ea5e9',
                  color: running['seo'] ? '#71717a' : '#fff',
                }}
              >
                {running['seo'] ? '优化中…' : '立即优化'}
              </button>
            </div>
          </div>

          {/* Trigger links */}
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#18181b', margin: 0 }}>触发链接</p>
                <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>通过 GET 请求直接触发 Agent，可用于外部调度器或书签</p>
              </div>
              <button
                onClick={handleGenerateToken}
                disabled={tokenSaving}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 500,
                  border: '1px solid #e4e4e7', borderRadius: '7px', cursor: tokenSaving ? 'not-allowed' : 'pointer',
                  background: '#fff', color: '#71717a', flexShrink: 0,
                }}
              >
                {tokenSaving ? '生成中…' : triggerToken ? '重新生成 Token' : '生成 Token'}
              </button>
            </div>

            {triggerToken ? (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(['content', 'seo'] as const).map(agent => {
                  const url = buildTriggerUrl(agent)
                  const key = `copy-${agent}`
                  return (
                    <div key={agent}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                        {agent === 'content' ? '内容 Agent' : 'SEO Agent'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code style={{
                          flex: 1, fontSize: '11.5px', color: '#3f3f46', background: '#f4f4f5',
                          padding: '7px 10px', borderRadius: '7px', wordBreak: 'break-all', lineHeight: 1.5,
                        }}>
                          {url}
                        </code>
                        <button
                          onClick={() => copyText(url, key)}
                          style={{
                            flexShrink: 0, padding: '7px 12px', fontSize: '12px', fontWeight: 500,
                            border: '1px solid #e4e4e7', borderRadius: '7px', cursor: 'pointer',
                            background: copied === key ? 'rgba(16,185,129,0.08)' : '#fff',
                            color: copied === key ? '#059669' : '#71717a',
                            transition: 'all 0.15s',
                          }}
                        >
                          {copied === key ? '已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                  )
                })}
                <p style={{ fontSize: '11px', color: '#a1a1aa', margin: 0 }}>
                  ⚠ Token 具有完整触发权限，请勿公开分享。重新生成后旧链接立即失效。
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#a1a1aa' }}>
                <p style={{ fontSize: '13px' }}>点击右上角「生成 Token」创建触发链接</p>
              </div>
            )}
          </div>

          {/* Task history */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: 0 }}>任务历史</h2>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>共 {total} 条</span>
            </div>

            {tasks.length === 0 ? (
              <div style={{ ...cardBase, textAlign: 'center', padding: '3rem 0', color: '#a1a1aa' }}>
                <p style={{ fontSize: '13px' }}>还没有执行过 AI 任务</p>
                <p style={{ fontSize: '12px', marginTop: '6px' }}>点击上方「立即生成」开始你的第一个 AI 任务</p>
              </div>
            ) : (
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                {tasks.map((task, i) => {
                  const st = STATUS_MAP[task.status] ?? STATUS_MAP.pending
                  const output = task.output as Record<string, unknown> | null
                  const articles = output?.articles as { id: string; title: string; slug: string; status: string }[] | undefined
                  const taskErrors = output?.errors as { topic: string; step: string; error: string }[] | undefined

                  const summary = task.status === 'done'
                    ? (task.type === 'content'
                        ? `生成 ${(output?.generated as number) ?? 0} 篇${taskErrors?.length ? `，${taskErrors.length} 个子步骤错误` : ''}`
                        : `优化 ${(output?.optimized as number) ?? 0} 篇`)
                    : task.error ?? ''

                  return (
                    <div key={task.id} style={{
                      padding: '12px 16px',
                      borderBottom: i < tasks.length - 1 ? '1px solid #f4f4f5' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#18181b', width: '76px', flexShrink: 0 }}>
                          {TYPE_LABEL[task.type] ?? task.type}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: st.bg, color: st.color, flexShrink: 0 }}>
                          {st.label}
                        </span>
                        <span style={{ flex: 1, fontSize: '12px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {summary}
                        </span>
                        <span style={{ fontSize: '11px', color: '#a1a1aa', flexShrink: 0 }}>{formatDate(task.created_at)}</span>
                        {task.completed_at && (
                          <span style={{ fontSize: '11px', color: '#a1a1aa', flexShrink: 0 }}>{task.completed_at - task.created_at}s</span>
                        )}
                      </div>

                      {articles && articles.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '88px' }}>
                          {articles.map(a => (
                            <Link
                              key={a.id}
                              href={`/admin/post/${a.id}`}
                              style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                                background: '#f4f4f5', color: '#3f3f46', textDecoration: 'none',
                                border: '1px solid #e4e4e7',
                              }}
                            >
                              {a.title.length > 20 ? a.title.slice(0, 20) + '…' : a.title}
                            </Link>
                          ))}
                        </div>
                      )}

                      {taskErrors && taskErrors.length > 0 && (
                        <div style={{ marginTop: '8px', paddingLeft: '88px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {taskErrors.map((e, ei) => (
                            <div key={ei} style={{
                              fontSize: '11px', padding: '4px 8px', borderRadius: '6px',
                              background: 'rgba(239,68,68,0.06)', color: '#dc2626',
                              border: '1px solid rgba(239,68,68,0.15)',
                            }}>
                              <span style={{ fontWeight: 600 }}>[{e.step}]</span>{' '}
                              {e.topic.length > 15 ? e.topic.slice(0, 15) + '…' : e.topic}：{e.error}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cron hint */}
          <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', marginBottom: '6px' }}>自动定时触发配置</p>
            <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7, margin: 0 }}>
              在 Cloudflare 部署 Worker，设置 Cron Trigger（如{' '}
              <code style={{ background: '#f4f4f5', padding: '1px 4px', borderRadius: '3px' }}>0 2 * * *</code>），
              在 <code style={{ background: '#f4f4f5', padding: '1px 4px', borderRadius: '3px' }}>scheduled()</code> 中调用{' '}
              <code style={{ background: '#f4f4f5', padding: '1px 4px', borderRadius: '3px' }}>POST /api/cron</code>（携带 CRON_SECRET）。
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 2: 内容 Agent ── */}
      {activeTab === 'content' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>

          {/* 左列：全局设置 */}
          <div style={{ ...cardBase, padding: '0' }}>

            {/* 行样式复用 */}
            {(
              [
                /* Section: 发布设置 */
                <div key="s1" style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f5' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>发布设置</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>文章长度</span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {([['short','短文'],['medium','中等'],['long','长文']] as const).map(([v, l]) => (
                          <button key={v} onClick={() => setLength(v)} style={{
                            padding: '5px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer',
                            border: length === v ? '1.5px solid #6366f1' : '1px solid #e4e4e7',
                            background: length === v ? 'rgba(99,102,241,0.07)' : '#fff',
                            color: length === v ? '#6366f1' : '#71717a',
                          }}>{l}</button>
                        ))}
                      </div>
                    </div>

                    {categoryPlans.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>每次篇数</span>
                        <input type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
                          style={{ ...inputBase, width: '60px', textAlign: 'center', padding: '5px 8px' }} />
                        <span style={{ fontSize: '12px', color: '#a1a1aa' }}>篇</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>自动发布</span>
                      <div onClick={() => setAutoPublish(!autoPublish)} style={{
                        width: '34px', height: '19px', borderRadius: '10px', flexShrink: 0,
                        background: autoPublish ? '#6366f1' : '#e4e4e7', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                      }}>
                        <div style={{ position: 'absolute', top: '2px', left: autoPublish ? '17px' : '2px', width: '15px', height: '15px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{autoPublish ? '直接发布' : '保存为草稿'}</span>
                    </div>
                  </div>
                </div>,

                /* Section: 内容方向 */
                <div key="s2" style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f5' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>内容方向</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {([
                      ['主题领域', siteTopics, setSiteTopics, '科技、AI、前端开发…'],
                      ['目标读者', targetAudience, setTargetAudience, '技术开发者、产品经理…'],
                      ['禁止话题', avoidTopics, setAvoidTopics, '政治、广告、违规内容…'],
                    ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>{label}</span>
                        <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                          style={{ ...inputBase, maxWidth: '360px', fontSize: '13px', padding: '5px 8px' }} />
                      </div>
                    ))}
                  </div>
                </div>,

                /* Section: 图片 */
                <div key="s3" style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f5' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>图片</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {([
                      ['封面图', imageSource, setImageSource as (v: string) => void, [['none','不生成'],['ai','AI 生成'],['unsplash','Unsplash']]],
                      ['正文配图', bodyImageSource, setBodyImageSource as (v: string) => void, [['none','不插入'],['unsplash','Unsplash'],['ai','AI 生成']]],
                    ] as [string, string, (v: string) => void, [string, string][]][]).map(([label, val, setter, opts]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>{label}</span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {opts.map(([v, l]) => (
                            <button key={v} onClick={() => setter(v)} style={{
                              padding: '5px 12px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', cursor: 'pointer',
                              border: val === v ? '1.5px solid #6366f1' : '1px solid #e4e4e7',
                              background: val === v ? 'rgba(99,102,241,0.07)' : '#fff',
                              color: val === v ? '#6366f1' : '#71717a',
                            }}>{l}</button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {(imageSource === 'unsplash' || bodyImageSource !== 'none') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>Unsplash Key</span>
                        <input type="password" value={unsplashKey} onChange={e => setUnsplashKey(e.target.value)}
                          placeholder="unsplash.com/developers"
                          style={{ ...inputBase, maxWidth: '280px', fontSize: '13px', padding: '5px 8px' }} />
                      </div>
                    )}
                  </div>
                </div>,

                /* Section: 模型 */
                <div key="s4" style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>模型</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {([
                      ['选题模型', topicModel, setTopicModel],
                      ['内容模型', contentModel, setContentModel],
                    ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#3f3f46', width: '72px', flexShrink: 0 }}>{label}</span>
                        <select value={val} onChange={e => setter(e.target.value)}
                          style={{ ...inputBase, maxWidth: '280px', fontSize: '13px', padding: '5px 8px', cursor: 'pointer' }}>
                          {TEXT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>,
              ]
            )}
          </div>

          {/* 右列：分类发布计划 */}
          <div style={cardBase}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>分类发布计划</p>

            {categories.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#a1a1aa' }}>暂无分类，请先创建分类</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoryPlans.map(plan => {
                  const cat = categories.find(c => c.id === plan.categoryId)
                  if (!cat) return null
                  return (
                    <div key={plan.categoryId} style={{ border: '1px solid #e4e4e7', borderRadius: '9px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', flex: 1 }}>{cat.name}</span>
                        <span style={{ fontSize: '11px', color: '#a1a1aa' }}>手动</span>
                        <input type="number" min={1} max={10} value={plan.count}
                          onChange={e => updateCategoryPlan(plan.categoryId, 'count', Number(e.target.value))}
                          style={{ ...inputBase, width: '40px', textAlign: 'center', fontSize: '12px', padding: '3px 6px' }} />
                        <span style={{ fontSize: '11px', color: '#a1a1aa' }}>篇 | 权重</span>
                        <input type="number" min={1} max={100} value={plan.weight ?? 1}
                          onChange={e => updateCategoryPlan(plan.categoryId, 'weight', Number(e.target.value))}
                          style={{ ...inputBase, width: '40px', textAlign: 'center', fontSize: '12px', padding: '3px 6px' }} />
                        <button onClick={() => removeCategoryPlan(plan.categoryId)}
                          style={{ fontSize: '12px', color: '#d4d4d8', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                      </div>
                      <input value={plan.topicFocus} onChange={e => updateCategoryPlan(plan.categoryId, 'topicFocus', e.target.value)}
                        placeholder="主题方向（留空用全局）"
                        style={{ ...inputBase, fontSize: '12px', padding: '5px 8px' }} />
                    </div>
                  )
                })}

                {categoryPlans.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 8px' }}>
                    未配置时使用全局篇数（{count} 篇），不关联分类
                  </p>
                )}

                {categories.filter(c => !categoryPlans.find(p => p.categoryId === c.id)).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                    {categories.filter(c => !categoryPlans.find(p => p.categoryId === c.id)).map(cat => (
                      <button key={cat.id} onClick={() => addCategoryPlan(cat.id)} style={{
                        fontSize: '12px', padding: '4px 9px', borderRadius: '6px', cursor: 'pointer',
                        border: '1px dashed #d4d4d8', background: '#fafafa', color: '#71717a',
                      }}>+ {cat.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 3: 发布计划 ── */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Master toggle */}
          <div style={cardBase}>
            <Toggle
              checked={scheduleEnabled}
              onChange={setScheduleEnabled}
              label="启用定时发布计划"
              desc="开启后，Cron 触发时将按照以下时间表运行，而不是每次都执行"
            />
          </div>

          {scheduleEnabled && (
            <>
              {/* Time slots */}
              <div style={cardBase}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 4px' }}>发布时段</h3>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 14px' }}>
                  选择每天哪些整点小时运行。Cron Worker 建议设为每小时触发一次（<code style={{ background: '#f4f4f5', padding: '1px 4px', borderRadius: '3px' }}>0 * * * *</code>），
                  只在选中的时段才会真正生成文章。
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <button
                      key={h}
                      onClick={() => toggleScheduleHour(h)}
                      style={{
                        width: '40px', height: '32px', fontSize: '12px', fontWeight: 500,
                        borderRadius: '7px', cursor: 'pointer',
                        border: scheduleHours.includes(h) ? '1.5px solid #6366f1' : '1px solid #e4e4e7',
                        background: scheduleHours.includes(h) ? 'rgba(99,102,241,0.1)' : '#fff',
                        color: scheduleHours.includes(h) ? '#6366f1' : '#71717a',
                      }}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#3f3f46', width: '80px', flexShrink: 0 }}>时区偏移</span>
                  <input
                    type="number" min={-12} max={14} value={scheduleTz}
                    onChange={e => setScheduleTz(Number(e.target.value))}
                    style={{ ...inputBase, width: '70px', textAlign: 'center', padding: '5px 8px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>UTC+{scheduleTz >= 0 ? scheduleTz : scheduleTz}（中国大陆为 +8）</span>
                </div>

                {scheduleHours.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#6366f1', marginTop: '10px', background: 'rgba(99,102,241,0.05)', borderRadius: '7px', padding: '7px 10px' }}>
                    将在每天 {scheduleHours.map(h => `${String(h).padStart(2,'0')}:00`).join('、')} 触发（UTC+{scheduleTz}）
                  </p>
                )}
              </div>

              {/* Per-run count */}
              <div style={cardBase}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 4px' }}>每次生成篇数</h3>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 14px' }}>
                  每次触发随机生成 Min ~ Max 篇文章，每日总量不超过上限。
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#3f3f46', width: '80px', flexShrink: 0 }}>最少篇数</span>
                    <input
                      type="number" min={1} max={20} value={scheduleRunMin}
                      onChange={e => { const v = Number(e.target.value); setScheduleRunMin(v); if (scheduleRunMax < v) setScheduleRunMax(v) }}
                      style={{ ...inputBase, width: '70px', textAlign: 'center', padding: '5px 8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>篇</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#3f3f46', width: '80px', flexShrink: 0 }}>最多篇数</span>
                    <input
                      type="number" min={scheduleRunMin} max={20} value={scheduleRunMax}
                      onChange={e => setScheduleRunMax(Math.max(scheduleRunMin, Number(e.target.value)))}
                      style={{ ...inputBase, width: '70px', textAlign: 'center', padding: '5px 8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>篇</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#3f3f46', width: '80px', flexShrink: 0 }}>每日上限</span>
                    <input
                      type="number" min={1} max={100} value={scheduleDailyMax}
                      onChange={e => setScheduleDailyMax(Number(e.target.value))}
                      style={{ ...inputBase, width: '70px', textAlign: 'center', padding: '5px 8px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#a1a1aa' }}>篇 / 天</span>
                  </div>
                </div>
                {scheduleHours.length > 0 && scheduleRunMin > 0 && (
                  <p style={{ fontSize: '12px', color: '#71717a', marginTop: '10px', background: '#f9f9fb', borderRadius: '7px', padding: '7px 10px' }}>
                    预计每天 {scheduleHours.length} 次触发，每次 {scheduleRunMin === scheduleRunMax ? scheduleRunMin : `${scheduleRunMin}–${scheduleRunMax}`} 篇，
                    最多 {Math.min(scheduleHours.length * scheduleRunMax, scheduleDailyMax)} 篇（受每日上限约束）
                  </p>
                )}
              </div>

              {/* Category weights hint */}
              <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', marginBottom: '5px' }}>分类权重</p>
                <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7, margin: 0 }}>
                  每次触发时按权重随机选择一个分类生成文章。在「内容 Agent」标签页的分类发布计划中为每个分类设置权重（数值越大，被选中概率越高）。
                  {categoryPlans.length > 0 ? (
                    <span style={{ display: 'block', marginTop: '6px' }}>
                      当前分类：{categoryPlans.map(p => {
                        const cat = categories.find(c => c.id === p.categoryId)
                        return cat ? `${cat.name}（权重 ${p.weight ?? 1}）` : null
                      }).filter(Boolean).join('、')}
                    </span>
                  ) : (
                    <span style={{ display: 'block', marginTop: '6px', color: '#a1a1aa' }}>
                      暂未配置分类计划，文章将不关联分类。
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab 4: SEO Agent ── */}

      {activeTab === 'seo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardBase}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 16px' }}>SEO Agent 配置</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <FieldLabel hint="1–50，避免超时建议不超过20">每批处理篇数</FieldLabel>
                <input
                  type="number" min={1} max={50} value={batchSize}
                  onChange={e => setBatchSize(Number(e.target.value))}
                  style={{ ...inputBase, maxWidth: '160px' }}
                />
              </div>
              <Toggle
                checked={priorityAI}
                onChange={setPriorityAI}
                label="优先处理 AI 生成内容"
                desc="开启后只处理 AI 生成的文章，适合内容量大的站点"
              />
            </div>
          </div>

          <div style={cardBase}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 16px' }}>模型配置</h3>
            <ModelSelect value={seoModel} onChange={setSeoModel} label="SEO 模型（生成 meta title / description）" />
            <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '8px' }}>建议使用轻量模型（Llama 3.1 8B），SEO meta 不需要大模型，可节省配额</p>
          </div>

          <div style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#0ea5e9', marginBottom: '6px' }}>工作原理</p>
            <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.7, margin: 0 }}>
              SEO Agent 扫描已发布文章中缺少 meta title 或 meta description 的条目，使用 AI 自动生成并写入。
              {priorityAI ? '当前仅处理 AI 生成的文章。' : '当前处理所有已发布文章。'}
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 4: 提示词 ── */}
      {activeTab === 'prompts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 2px' }}>选题提示词</h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>控制 AI 如何为你的网站生成文章选题</p>
              </div>
              <button
                onClick={() => setTopicPrompt('')}
                style={{ fontSize: '12px', color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={topicPrompt || DEFAULT_TOPIC_PROMPT}
              onChange={e => setTopicPrompt(e.target.value === DEFAULT_TOPIC_PROMPT ? '' : e.target.value)}
              rows={10}
              style={{ ...inputBase, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['{{siteName}}', '{{siteTopics}}', '{{audience}}', '{{avoidTopics}}', '{{existingTitles}}', '{{count}}'].map(v => (
                <code key={v} style={{ fontSize: '11px', background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px', color: '#6366f1' }}>{v}</code>
              ))}
            </div>
          </div>

          <div style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 2px' }}>内容生成 System Prompt</h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>定义 AI 的角色和整体写作规则</p>
              </div>
              <button
                onClick={() => setSystemPrompt('')}
                style={{ fontSize: '12px', color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={systemPrompt || DEFAULT_SYSTEM_PROMPT}
              onChange={e => setSystemPrompt(e.target.value === DEFAULT_SYSTEM_PROMPT ? '' : e.target.value)}
              rows={4}
              style={{ ...inputBase, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div style={cardBase}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#18181b', margin: '0 0 2px' }}>内容生成 User Prompt</h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>控制文章结构、格式和具体写作要求</p>
              </div>
              <button
                onClick={() => setUserPrompt('')}
                style={{ fontSize: '12px', color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={userPrompt || DEFAULT_USER_PROMPT}
              onChange={e => setUserPrompt(e.target.value === DEFAULT_USER_PROMPT ? '' : e.target.value)}
              rows={14}
              style={{ ...inputBase, fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['{{topic}}', '{{wordCount}}', '{{keywords}}', '{{style}}', '{{siteTopics}}', '{{audience}}'].map(v => (
                <code key={v} style={{ fontSize: '11px', background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px', color: '#6366f1' }}>{v}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save bar (hidden on dashboard tab only) */}
      {activeTab !== 'dashboard' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 20px', background: '#fff',
          border: '1px solid #e4e4e7', borderRadius: '12px',
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 24px', fontSize: '13px', fontWeight: 500,
              border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? '#f4f4f5' : '#6366f1',
              color: saving ? '#71717a' : '#fff',
            }}
          >
            {saving ? '保存中…' : '保存配置'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: '13px', color: saveMsg.includes('失败') ? '#ef4444' : '#059669' }}>
              {saveMsg}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

import { generateText, DEFAULT_MODELS } from '@/lib/ai'
import { createCategory, createContent, getCategoryBySlug, setContentCategories, setSetting } from '@/lib/db'
import { updateSiteSettings } from '@/lib/config'
import { generateId, slugify } from '@/lib/utils'
import type { InitBasicInfo, InitPlan } from '@/types'

const JINA_BASE = 'https://r.jina.ai'

async function fetchWithJina(url: string, apiKey?: string): Promise<string> {
  const headers: Record<string, string> = { Accept: 'text/plain' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  const resp = await fetch(`${JINA_BASE}/${url}`, {
    headers,
    signal: AbortSignal.timeout(40000),
  })
  if (resp.status === 429) {
    if (!apiKey) throw new Error('Jina 访问频率超限 (429)。请在 Cloudflare Workers 环境变量中配置 JINA_API_KEY（免费注册：https://jina.ai）')
    throw new Error(`Jina 429: ${url}`)
  }
  if (!resp.ok) throw new Error(`Jina fetch failed for ${url}: ${resp.status}`)
  return resp.text()
}

// 按关键词打分，优先抓取高价值页面
const PAGE_SCORES: { keywords: string[]; score: number; type: string }[] = [
  { keywords: ['contact', 'location', 'find-us', 'reach', '联系', '地址', '位置', '找到'], score: 10, type: 'contact' },
  { keywords: ['about', 'who-we-are', 'our-story', 'overview', '关于', '介绍', '我们', '简介'], score: 9, type: 'about' },
  { keywords: ['team', 'staff', 'doctor', 'physician', 'expert', 'specialist', '团队', '医生', '专家', '成员', '医师'], score: 8, type: 'team' },
  { keywords: ['service', 'treatment', 'procedure', 'program', 'offering', '服务', '项目', '治疗', '方案', '诊疗'], score: 7, type: 'service' },
  { keywords: ['case', 'success', 'result', 'testimonial', 'story', 'patient', '案例', '成功', '结果', '故事'], score: 6, type: 'case' },
]

function scoreUrl(url: string): number {
  const lower = url.toLowerCase()
  let max = 0
  for (const { keywords, score } of PAGE_SCORES) {
    if (keywords.some(k => lower.includes(k))) max = Math.max(max, score)
  }
  return max
}

function extractAndRankUrls(markdown: string, base: string): string[] {
  const origin = new URL(base).origin
  const seen = new Set<string>()
  const scored: { url: string; score: number }[] = []
  for (const m of markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)#?]+)\)/g)) {
    const u = m[2].replace(/\/$/, '')
    if (!u.startsWith(origin) || seen.has(u) || u === base.replace(/\/$/, '')) continue
    seen.add(u)
    scored.push({ url: u, score: scoreUrl(u) })
  }
  // Sort by score desc, then take top 8 (score > 0 first, then others)
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(x => x.url)
}

function extractFirstMeaningfulImage(markdown: string): string | undefined {
  const matches = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)]
    .map(m => m[1])
    .filter(url => {
      const lower = url.toLowerCase()
      return !lower.includes('logo') && !lower.includes('icon') &&
             !lower.includes('favicon') && !lower.includes('sprite') &&
             !lower.includes('.svg')
    })
  return matches[0]
}

function parseJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  // Find the first { ... } block
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI 未返回有效 JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function analyzeWebsite(
  env: CloudflareEnv,
  basicInfo: InitBasicInfo,
  contentSourceUrl: string,
  styleReferenceUrl?: string
): Promise<InitPlan> {
  const jinaKey = env.JINA_API_KEY || undefined

  // 1. Crawl homepage
  const homepageMd = await fetchWithJina(contentSourceUrl, jinaKey)

  // 2. Rank and crawl sub-pages (up to 6)
  const subUrls = extractAndRankUrls(homepageMd, contentSourceUrl)
  const crawledPages: { url: string; content: string; type?: string }[] = []
  for (const u of subUrls.slice(0, 6)) {
    await new Promise(r => setTimeout(r, 800))
    try {
      const md = await fetchWithJina(u, jinaKey)
      const pageType = PAGE_SCORES.find(p => p.keywords.some(k => u.toLowerCase().includes(k)))?.type
      crawledPages.push({ url: u, content: md.slice(0, 6000), type: pageType })
    } catch {
      // best-effort
    }
  }

  // 3. From team pages, extract and crawl individual profile pages (doctors/staff)
  const teamPages = crawledPages.filter(p => p.type === 'team')
  const profileUrls = new Set<string>()
  for (const tp of teamPages) {
    const origin = new URL(contentSourceUrl).origin
    for (const m of tp.content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)#?]+)\)/g)) {
      const u = m[2].replace(/\/$/, '')
      if (!u.startsWith(origin) || crawledPages.some(p => p.url === u)) continue
      const lower = u.toLowerCase()
      // Match individual profile patterns: /team/name, /doctor/name, /dr-name, /physicians/name etc.
      if (/\/(team|doctor|dr|physician|staff|specialist|expert|member)s?\/[^/]+$/.test(lower)) {
        profileUrls.add(u)
      }
    }
  }
  for (const u of Array.from(profileUrls).slice(0, 6)) {
    await new Promise(r => setTimeout(r, 800))
    try {
      const md = await fetchWithJina(u, jinaKey)
      crawledPages.push({ url: u, content: md, type: 'profile' })
    } catch {
      // best-effort
    }
  }

  // Build map of profile URL → { raw content, image URL }
  const profileContentMap = new Map<string, { content: string; imageUrl?: string }>()
  for (const p of crawledPages.filter(pg => pg.type === 'profile')) {
    profileContentMap.set(p.url, {
      content: p.content,
      imageUrl: extractFirstMeaningfulImage(p.content),
    })
  }

  // 4. Optional style reference
  let styleMd = ''
  if (styleReferenceUrl) {
    await new Promise(r => setTimeout(r, 800))
    try { styleMd = await fetchWithJina(styleReferenceUrl, jinaKey) } catch { /* ignore */ }
  }

  // Profile pages first (AI needs URL + name to match); full content stays in profileContentMap
  const profilePages = crawledPages.filter(p => p.type === 'profile')
  const nonProfilePages = crawledPages.filter(p => p.type !== 'profile')
  const allContent = [
    `=== 首页 ===\n${homepageMd.slice(0, 3000)}`,
    ...profilePages.map(p => `=== ${p.url} [profile] ===\n${p.content.slice(0, 600)}`),
    ...nonProfilePages.map(p => `=== ${p.url}${p.type ? ` [${p.type}]` : ''} ===\n${p.content.slice(0, 2500)}`),
  ].join('\n\n')

  const langLabel = basicInfo.language === 'zh' ? '中文' : basicInfo.language === 'en' ? '英文' : '中英双语'
  const siteTypeLabel: Record<string, string> = { showcase: '展示型', marketing: '营销型', news: '资讯型', ecommerce: '电商型' }

  // ── AI Call 1: 提取结构化数据 ──────────────────────────────
  const extractPrompt = `
你是一个专业的数据提取助手。从以下网页内容中提取结构化信息，必须以纯 JSON 格式输出，不含 markdown 代码块。

## 网页内容
${allContent.slice(0, 12000)}

## 提取任务
严格按以下 JSON 结构输出（字段缺失时用空值，不要省略字段）：
{
  "contactInfo": {
    "phone": "电话号码，没有则空字符串",
    "address": "地址，没有则空字符串",
    "email": "邮箱，没有则空字符串",
    "hours": "营业时间，没有则空字符串"
  },
  "aboutPage": {
    "title": "关于我们",
    "content": "机构介绍正文，300字以内，Markdown格式，没有相关内容则空字符串"
  },
  "teamMembers": [
    { "name": "姓名", "title": "职称/职位", "profileUrl": "该人员的独立 [profile] 页面 URL，从页面列表中精确匹配，没有则空字符串", "bio": "若无独立 profile 页则提取可用简介，否则留空" }
  ],
  "services": [
    { "name": "服务名称", "slug": "service-slug", "description": "完整服务描述，保留原始信息，Markdown格式" }
  ],
  "cases": [
    { "title": "案例标题", "description": "完整案例描述，保留原始信息", "outcome": "结果/成效" }
  ]
}
`

  // ── AI Call 2: 生成网站配置 ──────────────────────────────
  const configPrompt = `
你是一个网站内容策略师。根据以下信息生成网站初始化配置，必须以纯 JSON 格式输出，不含 markdown 代码块。

## 网站基础信息
- 名称：${basicInfo.siteName}
- 语言：${langLabel}
- 类型：${siteTypeLabel[basicInfo.siteType] || basicInfo.siteType}
- 行业：${basicInfo.industry}
- 目标受众：${basicInfo.targetAudience}
${basicInfo.brandColor ? `- 品牌色：${basicInfo.brandColor}` : ''}
${styleMd ? `\n## 样式参考\n${styleMd.slice(0, 1500)}` : ''}

## 来源网站摘要
${homepageMd.slice(0, 2000)}

## 任务
严格按以下 JSON 结构输出：
{
  "siteSettings": { "name": "${basicInfo.siteName}", "description": "网站简介50字以内" },
  "categories": [
    { "name": "分类名", "slug": "slug", "description": "描述" }
  ],
  "navigation": [
    { "label": "导航名", "url": "/路径" }
  ],
  "aiConfig": {
    "siteTopics": "内容方向描述",
    "targetAudience": "目标受众描述",
    "writingStyle": "写作风格描述"
  },
  "importItems": [
    { "title": "文章标题", "content": "正文150字以内Markdown", "excerpt": "摘要80字以内", "categorySlug": "分类slug" }
  ],
  "summary": "一段话总结整体方案"
}

要求：分类 4-6 个，导航 3-5 项，importItems 3-5 篇。
`

  // Run both AI calls in parallel
  const [extractRaw, configRaw] = await Promise.all([
    generateText(env, extractPrompt, undefined, 8000, DEFAULT_MODELS.content),
    generateText(env, configPrompt, undefined, 5000, DEFAULT_MODELS.content),
  ])

  const extracted = parseJson(extractRaw) as {
    contactInfo: InitPlan['contactInfo']
    aboutPage?: InitPlan['aboutPage']
    teamMembers: (InitPlan['teamMembers'][number] & { profileUrl?: string })[]
    services: InitPlan['services']
    cases: InitPlan['cases']
  }

  const config = parseJson(configRaw) as {
    siteSettings: InitPlan['siteSettings']
    categories: InitPlan['categories']
    navigation: InitPlan['navigation']
    aiConfig: InitPlan['aiConfig']
    importItems: InitPlan['importItems']
    summary: string
  }

  // Enrich team members: use raw profile page content for bio, extract image URL
  const enrichedTeamMembers: InitPlan['teamMembers'] = (extracted.teamMembers ?? []).map(m => {
    const profileData = m.profileUrl ? profileContentMap.get(m.profileUrl) : undefined
    return {
      name: m.name,
      title: m.title,
      bio: profileData ? profileData.content : (m.bio || ''),
      imageUrl: profileData?.imageUrl,
    }
  })

  return {
    siteSettings: config.siteSettings ?? { name: basicInfo.siteName, description: '' },
    contactInfo: extracted.contactInfo ?? {},
    aboutPage: extracted.aboutPage?.content ? extracted.aboutPage : undefined,
    teamMembers: enrichedTeamMembers,
    services: extracted.services ?? [],
    cases: extracted.cases ?? [],
    categories: config.categories ?? [],
    navigation: config.navigation ?? [],
    aiConfig: config.aiConfig ?? { siteTopics: '', targetAudience: '', writingStyle: '' },
    importItems: config.importItems ?? [],
    summary: config.summary ?? '',
  }
}

export type RefreshSectionType = 'contact' | 'about' | 'team' | 'services' | 'cases'

const SECTION_PAGE_TYPES: Record<RefreshSectionType, string[]> = {
  contact: ['contact'],
  about: ['about'],
  team: ['team'],
  services: ['service'],
  cases: ['case'],
}

const SECTION_PROMPTS: Record<RefreshSectionType, string> = {
  contact: `提取联系信息，纯JSON输出：{"contactInfo":{"phone":"","address":"","email":"","hours":""}}`,
  about: `提取机构介绍，纯JSON输出：{"aboutPage":{"title":"关于我们","content":"300字以内Markdown正文"}}`,
  team: `提取团队成员，纯JSON输出：{"teamMembers":[{"name":"","title":"","profileUrl":"对应[profile]页面的完整URL，精确匹配页面列表，没有则空字符串","bio":"若无profile页则提取可用简介，否则留空"}]}`,
  services: `提取服务项目，纯JSON输出：{"services":[{"name":"","slug":"service-slug","description":"完整描述Markdown"}]}`,
  cases: `提取成功案例，纯JSON输出：{"cases":[{"title":"","description":"完整描述","outcome":"结果/成效"}]}`,
}

export async function refreshSection(
  env: CloudflareEnv,
  type: RefreshSectionType,
  contentSourceUrl: string,
): Promise<Partial<InitPlan>> {
  const jinaKey = env.JINA_API_KEY || undefined
  const homepageMd = await fetchWithJina(contentSourceUrl, jinaKey)

  // Find URLs relevant to this section
  const subUrls = extractAndRankUrls(homepageMd, contentSourceUrl)
  const relevantTypes = SECTION_PAGE_TYPES[type]
  const relevantUrls = subUrls.filter(url =>
    PAGE_SCORES.some(p => relevantTypes.includes(p.type) && p.keywords.some(k => url.toLowerCase().includes(k)))
  )

  const crawledPages: { url: string; content: string; type?: string }[] = []
  for (const u of relevantUrls.slice(0, 3)) {
    await new Promise(r => setTimeout(r, 800))
    try {
      const md = await fetchWithJina(u, jinaKey)
      const pageType = PAGE_SCORES.find(p => p.keywords.some(k => u.toLowerCase().includes(k)))?.type
      crawledPages.push({ url: u, content: md.slice(0, 6000), type: pageType })
    } catch { /* ignore */ }
  }

  // For team: also crawl individual profile pages
  const profileContentMap = new Map<string, { content: string; imageUrl?: string }>()
  if (type === 'team') {
    const origin = new URL(contentSourceUrl).origin
    const profileUrls = new Set<string>()
    for (const tp of crawledPages.filter(p => p.type === 'team')) {
      for (const m of tp.content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)#?]+)\)/g)) {
        const u = m[2].replace(/\/$/, '')
        if (!u.startsWith(origin) || crawledPages.some(p => p.url === u)) continue
        if (/\/(team|doctor|dr|physician|staff|specialist|expert|member)s?\/[^/]+$/.test(u.toLowerCase())) {
          profileUrls.add(u)
        }
      }
    }
    for (const u of Array.from(profileUrls).slice(0, 6)) {
      await new Promise(r => setTimeout(r, 800))
      try {
        const md = await fetchWithJina(u, jinaKey)
        crawledPages.push({ url: u, content: md, type: 'profile' })
        profileContentMap.set(u, { content: md, imageUrl: extractFirstMeaningfulImage(md) })
      } catch { /* ignore */ }
    }
  }

  const profilePages = crawledPages.filter(p => p.type === 'profile')
  const nonProfilePages = crawledPages.filter(p => p.type !== 'profile')
  const pageContent = [
    `=== 首页 ===\n${homepageMd.slice(0, 2000)}`,
    ...profilePages.map(p => `=== ${p.url} [profile] ===\n${p.content.slice(0, 600)}`),
    ...nonProfilePages.map(p => `=== ${p.url}${p.type ? ` [${p.type}]` : ''} ===\n${p.content.slice(0, 3000)}`),
  ].join('\n\n')

  const prompt = `你是数据提取助手。${SECTION_PROMPTS[type]}\n\n## 网页内容\n${pageContent.slice(0, 10000)}`
  const raw = await generateText(env, prompt, undefined, 6000, DEFAULT_MODELS.content)
  const result = parseJson(raw) as Partial<InitPlan> & {
    teamMembers?: (InitPlan['teamMembers'][number] & { profileUrl?: string })[]
  }

  if (type === 'team' && result.teamMembers) {
    type RawMember = InitPlan['teamMembers'][number] & { profileUrl?: string }
    result.teamMembers = (result.teamMembers as RawMember[]).map(m => {
      const profileData = m.profileUrl ? profileContentMap.get(m.profileUrl) : undefined
      return {
        name: m.name,
        title: m.title,
        bio: profileData ? profileData.content : (m.bio || ''),
        imageUrl: profileData?.imageUrl,
      }
    })
  }

  return result
}

export interface ExecuteResult {
  settingsUpdated: boolean
  categoriesCreated: number
  contentsImported: number
  errors: string[]
}

async function createPostInCategory(
  db: D1Database,
  { title, content, excerpt, categoryId, userId, type = 'post', coverImage }: {
    title: string; content: string; excerpt: string
    categoryId?: string; userId?: string; type?: string; coverImage?: string
  }
): Promise<void> {
  const id = generateId()
  const baseSlug = slugify(title)
  const slug = baseSlug ? `${baseSlug}-${id.slice(-6)}` : id
  await createContent(db, {
    id, type, title, slug, content,
    excerpt: excerpt || null,
    status: 'published',
    author_id: userId ?? null,
    cover_image: coverImage ?? null,
    published_at: Math.floor(Date.now() / 1000),
    scheduled_at: null,
    meta_title: null,
    meta_description: excerpt || null,
    og_image: null,
    ai_generated: true,
    ai_reviewed: false,
    parent_id: null,
    sort_order: 0,
  })
  if (categoryId) await setContentCategories(db, id, [categoryId])
}

async function ensureCategory(
  db: D1Database,
  name: string,
  slug: string,
  description?: string
): Promise<string> {
  const existing = await getCategoryBySlug(db, 'post', slug)
  if (existing) return existing.id
  const id = generateId()
  await createCategory(db, { id, content_type: 'post', name, slug, description: description ?? null })
  return id
}

export async function executeInitPlan(
  db: D1Database,
  plan: InitPlan,
  userId?: string
): Promise<ExecuteResult> {
  const errors: string[] = []
  let contentsImported = 0

  // 1. Site settings + contact info + nav
  try {
    await updateSiteSettings(db, {
      'site.name': plan.siteSettings.name,
      'site.description': plan.siteSettings.description,
      ...(plan.siteSettings.url ? { 'site.url': plan.siteSettings.url } : {}),
      'ai.content.siteTopics': plan.aiConfig.siteTopics,
      'ai.content.targetAudience': plan.aiConfig.targetAudience,
      'ai.writingStyle': plan.aiConfig.writingStyle,
      ...(plan.contactInfo.phone ? { 'site.contact.phone': plan.contactInfo.phone } : {}),
      ...(plan.contactInfo.address ? { 'site.contact.address': plan.contactInfo.address } : {}),
      ...(plan.contactInfo.email ? { 'site.contact.email': plan.contactInfo.email } : {}),
      ...(plan.contactInfo.hours ? { 'site.contact.hours': plan.contactInfo.hours } : {}),
    })
    const navItems = plan.navigation.map(item => ({ id: generateId(), label: item.label, url: item.url }))
    await setSetting(db, 'nav.main', navItems)
  } catch (e) {
    errors.push(`settings: ${String(e)}`)
  }

  // 2. About page
  if (plan.aboutPage?.content) {
    try {
      await createPostInCategory(db, {
        title: plan.aboutPage.title || '关于我们',
        content: plan.aboutPage.content,
        excerpt: plan.aboutPage.content.slice(0, 100),
        userId,
        type: 'page',
      })
      contentsImported++
    } catch (e) {
      errors.push(`about page: ${String(e)}`)
    }
  }

  // 3. Named categories from plan
  const categoryMap = new Map<string, string>()
  let categoriesCreated = 0
  for (const cat of plan.categories) {
    try {
      const id = await ensureCategory(db, cat.name, cat.slug, cat.description)
      categoryMap.set(cat.slug, id)
      categoriesCreated++
    } catch (e) {
      errors.push(`category ${cat.slug}: ${String(e)}`)
    }
  }

  // 4. Team members → posts under 团队介绍 category
  if (plan.teamMembers.length > 0) {
    let teamCatId: string | undefined
    try {
      teamCatId = await ensureCategory(db, '团队介绍', 'team', '团队成员介绍')
      categoriesCreated++
    } catch (e) {
      errors.push(`category team: ${String(e)}`)
    }
    for (const m of plan.teamMembers) {
      try {
        await createPostInCategory(db, {
          title: m.name,
          content: `## ${m.title}\n\n${m.bio}`,
          excerpt: `${m.title} — ${m.bio.slice(0, 80)}`,
          categoryId: teamCatId,
          userId,
          coverImage: m.imageUrl,
        })
        contentsImported++
      } catch (e) {
        errors.push(`team ${m.name}: ${String(e)}`)
      }
    }
  }

  // 5. Services → posts under 服务项目 category
  if (plan.services.length > 0) {
    let svcCatId: string | undefined
    try {
      svcCatId = await ensureCategory(db, '服务项目', 'services', '提供的服务与方案')
      categoriesCreated++
    } catch (e) {
      errors.push(`category services: ${String(e)}`)
    }
    for (const s of plan.services) {
      try {
        await createPostInCategory(db, {
          title: s.name,
          content: s.description,
          excerpt: s.description.slice(0, 100),
          categoryId: svcCatId,
          userId,
        })
        contentsImported++
      } catch (e) {
        errors.push(`service ${s.name}: ${String(e)}`)
      }
    }
  }

  // 6. Cases → posts under 成功案例 category
  if (plan.cases.length > 0) {
    let caseCatId: string | undefined
    try {
      caseCatId = await ensureCategory(db, '成功案例', 'cases', '客户案例与成果')
      categoriesCreated++
    } catch (e) {
      errors.push(`category cases: ${String(e)}`)
    }
    for (const c of plan.cases) {
      try {
        await createPostInCategory(db, {
          title: c.title,
          content: c.outcome ? `${c.description}\n\n**结果：** ${c.outcome}` : c.description,
          excerpt: c.description.slice(0, 100),
          categoryId: caseCatId,
          userId,
        })
        contentsImported++
      } catch (e) {
        errors.push(`case ${c.title}: ${String(e)}`)
      }
    }
  }

  // 7. General import items
  for (const item of plan.importItems) {
    try {
      await createPostInCategory(db, {
        title: item.title,
        content: item.content,
        excerpt: item.excerpt,
        categoryId: item.categorySlug ? categoryMap.get(item.categorySlug) : undefined,
        userId,
      })
      contentsImported++
    } catch (e) {
      errors.push(`import ${item.title}: ${String(e)}`)
    }
  }

  return {
    settingsUpdated: errors.filter(e => e.startsWith('settings')).length === 0,
    categoriesCreated,
    contentsImported,
    errors,
  }
}

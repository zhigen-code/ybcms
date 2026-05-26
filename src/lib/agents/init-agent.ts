import { generateText, DEFAULT_MODELS } from '@/lib/ai'
import { createCategory, createContent, setContentCategories, setSetting } from '@/lib/db'
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
    if (!apiKey) {
      throw new Error('Jina 访问频率超限 (429)。请在 Cloudflare Workers 环境变量中配置 JINA_API_KEY 以解除限制（免费注册：https://jina.ai）')
    }
    throw new Error(`Jina 429: ${url}`)
  }
  if (!resp.ok) throw new Error(`Jina fetch failed for ${url}: ${resp.status}`)
  return resp.text()
}

function extractUrls(markdown: string, base: string): string[] {
  const origin = new URL(base).origin
  const matches = markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)
  const seen = new Set<string>()
  const result: string[] = []
  for (const m of matches) {
    const u = m[2]
    if (u.startsWith(origin) && !seen.has(u) && u !== base) {
      seen.add(u)
      result.push(u)
    }
  }
  return result.slice(0, 8)
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

  // 2. Extract sub-page URLs from homepage, crawl up to 3 sequentially
  const subUrls = extractUrls(homepageMd, contentSourceUrl)
  const subPageContents: string[] = []
  for (const u of subUrls.slice(0, 3)) {
    await new Promise(r => setTimeout(r, 1000))
    try {
      const md = await fetchWithJina(u, jinaKey)
      subPageContents.push(`=== ${u} ===\n${md.slice(0, 3000)}`)
    } catch {
      // skip on any error, sub-pages are best-effort
    }
  }

  // 3. (Optional) crawl style reference
  let styleMd = ''
  if (styleReferenceUrl) {
    await new Promise(r => setTimeout(r, 1000))
    try {
      styleMd = await fetchWithJina(styleReferenceUrl, jinaKey)
    } catch {
      // ignore
    }
  }

  const langLabel = basicInfo.language === 'zh' ? '中文' : basicInfo.language === 'en' ? '英文' : '中英双语'
  const siteTypeLabel: Record<string, string> = {
    showcase: '展示型',
    marketing: '营销型',
    news: '资讯型',
    ecommerce: '电商型',
  }

  const systemPrompt = `你是一个专业的网站内容策略师和架构师。用户需要基于一个已有网站建立新网站，你的任务是分析源站内容，生成完整的网站初始化方案，必须以纯 JSON 格式输出，不要包含任何 markdown 代码块或多余文字。`

  const userPrompt = `
## 网站基础信息
- 网站名称：${basicInfo.siteName}
- 语言：${langLabel}
- 网站类型：${siteTypeLabel[basicInfo.siteType] || basicInfo.siteType}
- 行业：${basicInfo.industry}
- 目标受众：${basicInfo.targetAudience}
${basicInfo.brandColor ? `- 品牌色：${basicInfo.brandColor}` : ''}

## 来源网站内容（首页）
${homepageMd.slice(0, 4000)}

${subPageContents.length > 0 ? `## 来源网站子页面内容\n${subPageContents.join('\n\n').slice(0, 6000)}` : ''}

${styleMd ? `## 样式参考网站\n${styleMd.slice(0, 2000)}` : ''}

## 任务
请分析以上内容，生成网站初始化方案，要求：
1. 根据行业和网站类型，建议 4-8 个合适的内容分类
2. 设计主导航（3-6 项）
3. 生成 AI 内容配置（话题方向、写作风格）
4. 从来源网站提取或改写 3-5 篇示例内容，每篇 300-500 字，指定所属分类
5. 用一段话总结方案

严格按以下 JSON 结构输出，不要包含注释，不要用 markdown 代码块：
{
  "siteSettings": {
    "name": "网站名称",
    "description": "网站简介（50字以内）"
  },
  "categories": [
    { "name": "分类名", "slug": "category-slug", "description": "分类描述" }
  ],
  "navigation": [
    { "label": "导航名", "url": "/路径" }
  ],
  "aiConfig": {
    "siteTopics": "AI 内容方向描述",
    "targetAudience": "目标受众描述",
    "writingStyle": "写作风格描述"
  },
  "importItems": [
    { "title": "文章标题", "content": "正文内容（Markdown）", "excerpt": "摘要（100字以内）", "categorySlug": "对应分类 slug" }
  ],
  "summary": "方案总结"
}
`

  const raw = await generateText(env, userPrompt, systemPrompt, 6000, DEFAULT_MODELS.content)

  // Strip potential code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const plan = JSON.parse(cleaned) as InitPlan
  return plan
}

export interface ExecuteResult {
  settingsUpdated: boolean
  categoriesCreated: number
  contentsImported: number
  errors: string[]
}

export async function executeInitPlan(
  db: D1Database,
  plan: InitPlan,
  userId?: string
): Promise<ExecuteResult> {
  const errors: string[] = []

  // 1. Update site settings
  try {
    await updateSiteSettings(db, {
      'site.name': plan.siteSettings.name,
      'site.description': plan.siteSettings.description,
      ...(plan.siteSettings.url ? { 'site.url': plan.siteSettings.url } : {}),
      'ai.content.siteTopics': plan.aiConfig.siteTopics,
      'ai.content.targetAudience': plan.aiConfig.targetAudience,
      'ai.writingStyle': plan.aiConfig.writingStyle,
    })

    // Navigation
    const navItems = plan.navigation.map(item => ({
      id: generateId(),
      label: item.label,
      url: item.url,
    }))
    await setSetting(db, 'nav.main', navItems)
  } catch (e) {
    errors.push(`settings: ${String(e)}`)
  }

  // 2. Create categories
  const categoryMap = new Map<string, string>() // slug → id
  let categoriesCreated = 0
  for (const cat of plan.categories) {
    try {
      const id = generateId()
      await createCategory(db, {
        id,
        content_type: 'post',
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? null,
      })
      categoryMap.set(cat.slug, id)
      categoriesCreated++
    } catch (e) {
      errors.push(`category ${cat.slug}: ${String(e)}`)
    }
  }

  // 3. Import content
  let contentsImported = 0
  for (const item of plan.importItems) {
    try {
      const id = generateId()
      const slug = slugify(item.title) || id
      await createContent(db, {
        id,
        type: 'post',
        title: item.title,
        slug,
        content: item.content,
        excerpt: item.excerpt || null,
        status: 'published',
        author_id: userId ?? null,
        cover_image: null,
        published_at: Math.floor(Date.now() / 1000),
        scheduled_at: null,
        meta_title: null,
        meta_description: item.excerpt || null,
        og_image: null,
        ai_generated: true,
        ai_reviewed: false,
        parent_id: null,
        sort_order: 0,
      })

      if (item.categorySlug && categoryMap.has(item.categorySlug)) {
        const catId = categoryMap.get(item.categorySlug)!
        await setContentCategories(db, id, [catId])
      }
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

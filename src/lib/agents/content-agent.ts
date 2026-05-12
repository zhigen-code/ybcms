import { generateArticle, generateSEOMeta, generateText, DEFAULT_MODELS } from '@/lib/ai'
import { getContents, createContent, setContentCategories, setContentTags } from '@/lib/db'
import { getSiteSettings } from '@/lib/config'
import { saveCoverImage, injectArticleImages } from '@/lib/image'
import { generateId, slugify } from '@/lib/utils'
import type { AgentResult, AgentRunOptions } from './base'
import type { CategoryPlan } from '@/types'

// 将关键词第一次出现替换为 tag 内链（跳过标题行、代码块、已有链接内）
function injectTagLinks(content: string, tags: { name: string; slug: string }[]): string {
  if (!tags.length) return content
  const lines = content.split('\n')
  const used = new Set<string>()
  let inCode = false

  return lines.map(line => {
    if (line.startsWith('```')) { inCode = !inCode; return line }
    if (inCode) return line
    if (/^#{1,6}\s/.test(line)) return line  // 跳过标题

    let result = line
    for (const tag of tags) {
      if (used.has(tag.name)) continue
      const idx = result.indexOf(tag.name)
      if (idx === -1) continue
      // 确保不在已有 markdown 链接括号内
      const before = result.slice(0, idx)
      const openBrackets = (before.match(/\[/g) ?? []).length
      const closeBrackets = (before.match(/\]/g) ?? []).length
      if (openBrackets > closeBrackets) continue
      result = result.slice(0, idx) + `[${tag.name}](/tag/${tag.slug})` + result.slice(idx + tag.name.length)
      used.add(tag.name)
    }
    return result
  }).join('\n')
}

// 默认选题提示词模板，支持变量
const DEFAULT_TOPIC_PROMPT = `你是一个内容策略师，正在为名为"{{siteName}}"的网站规划内容。
{{siteTopics}}{{audience}}{{avoidTopics}}
已有文章标题（避免重复选题）：
{{existingTitles}}

请建议 {{count}} 个全新的、有吸引力的文章选题。
直接返回 JSON 数组，不要其他内容：["选题1", "选题2", ...]`

export async function suggestTopics(
  env: CloudflareEnv,
  existing: string[],
  options: {
    siteName: string
    count: number
    siteTopics?: string
    targetAudience?: string
    avoidTopics?: string
    topicPrompt?: string
    model?: string
  }
): Promise<string[]> {
  const prompt = (options.topicPrompt || DEFAULT_TOPIC_PROMPT)
    .replace('{{siteName}}', options.siteName)
    .replace('{{siteTopics}}', options.siteTopics ? `网站主题领域：${options.siteTopics}\n` : '')
    .replace('{{audience}}', options.targetAudience ? `目标读者：${options.targetAudience}\n` : '')
    .replace('{{avoidTopics}}', options.avoidTopics ? `禁止涉及：${options.avoidTopics}\n` : '')
    .replace('{{existingTitles}}', existing.slice(0, 30).map((t, i) => `${i + 1}. ${t}`).join('\n') || '（暂无）')
    .replace('{{count}}', String(options.count))

  const raw = String(await generateText(env, prompt, undefined, 1024, options.model ?? DEFAULT_MODELS.topic) ?? '')
  try {
    const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (!match) return []
    const topics: string[] = JSON.parse(match[0])
    return Array.isArray(topics) ? topics.filter(t => typeof t === 'string' && t.trim()).slice(0, options.count) : []
  } catch {
    const fallback = raw.match(/"([^"]{5,80})"/g)?.map(s => s.slice(1, -1)) ?? []
    return fallback.slice(0, options.count)
  }
}

// 为单个分类计划生成并保存文章
async function runPlan(
  db: D1Database,
  env: CloudflareEnv,
  plan: { categoryId: string | null; count: number; topicFocus: string },
  shared: {
    siteName: string; writingStyle: string; length: 'short' | 'medium' | 'long'
    autoPublish: boolean; imageSource: 'ai' | 'unsplash' | 'none'; unsplashKey: string
    bodyImageSource: 'none' | 'unsplash' | 'ai'; siteTopics: string; targetAudience: string; avoidTopics: string
    topicModel: string; contentModel: string; seoModel: string
    topicPrompt: string; systemPrompt: string; userPrompt: string
    existingTitles: string[]
  }
) {
  const generated: { id: string; title: string; slug: string; status: string; coverGenerated: boolean; categoryId: string | null }[] = []
  const errors: { topic: string; step: string; error: string }[] = []

  const topics = await suggestTopics(env, shared.existingTitles, {
    siteName: shared.siteName,
    count: plan.count,
    siteTopics: plan.topicFocus || undefined,
    targetAudience: shared.targetAudience || undefined,
    avoidTopics: shared.avoidTopics || undefined,
    topicPrompt: shared.topicPrompt || undefined,
    model: shared.topicModel,
  })

  for (const topic of topics) {
    let step = '内容生成'
    try {
      const article = await generateArticle(env, {
        topic, style: shared.writingStyle, length: shared.length,
        siteTopics: plan.topicFocus || undefined,
        targetAudience: shared.targetAudience || undefined,
        systemPrompt: shared.systemPrompt || undefined,
        userPromptTemplate: shared.userPrompt || undefined,
        model: shared.contentModel,
      })

      step = 'SEO生成'
      const seo = await generateSEOMeta(env, { title: article.title, content: article.content }, shared.seoModel)

      // 正文配图
      step = '正文配图'
      let finalContent = article.content
      if (shared.bodyImageSource !== 'none') {
        try {
          const injected = await injectArticleImages(env, article.content, article.title, shared.bodyImageSource, shared.unsplashKey, 2, shared.siteTopics || 'nature')
          finalContent = injected.content
          for (const e of injected.errors) {
            errors.push({ topic, step: `正文配图(${e.heading})`, error: e.error })
          }
        } catch (imgErr) {
          errors.push({ topic, step: '正文配图', error: imgErr instanceof Error ? imgErr.message : String(imgErr) })
        }
      }

      // 封面图：优先复用正文第一张配图，没有才单独生成
      step = '封面图生成'
      let coverImage: string | null = null
      let coverGenerated = false
      const firstBodyImage = finalContent.match(/!\[.*?\]\(([^)]+)\)/)?.[1] ?? null
      if (firstBodyImage) {
        coverImage = firstBodyImage
        coverGenerated = true
      } else if (shared.imageSource !== 'none') {
        try {
          const imgQuery = plan.topicFocus || shared.siteName || article.title
          const result = await saveCoverImage(env, {
            source: shared.imageSource as 'ai' | 'unsplash',
            query: imgQuery,
            unsplashKey: shared.unsplashKey,
            genericFallback: shared.siteTopics || 'healthcare',
          })
          coverImage = result.url
          coverGenerated = true
        } catch (imgErr) {
          errors.push({ topic, step: '封面图生成', error: imgErr instanceof Error ? imgErr.message : String(imgErr) })
        }
      }

      // 注入 tag 内链
      const tagLinks = seo.keywords.map(k => ({ name: k, slug: slugify(k) }))
      const linkedContent = injectTagLinks(finalContent, tagLinks)

      step = '保存文章'
      const id = generateId()
      const rawSlug = slugify(article.title).replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const slug = rawSlug || id
      const now = Math.floor(Date.now() / 1000)

      await createContent(db, {
        id, type: 'post',
        title: article.title, slug,
        content: linkedContent, excerpt: article.excerpt,
        status: shared.autoPublish ? 'published' : 'draft',
        author_id: null, cover_image: coverImage,
        parent_id: null, sort_order: 0,
        published_at: shared.autoPublish ? now : null, scheduled_at: null,
        meta_title: seo.metaTitle || article.title,
        meta_description: seo.metaDescription || article.excerpt,
        og_image: null, ai_generated: true, ai_reviewed: false,
      })

      step = '分类&标签关联'
      if (plan.categoryId) {
        await setContentCategories(db, id, [plan.categoryId])
      }
      if (seo.keywords.length > 0) {
        await setContentTags(db, id, seo.keywords)
      }

      generated.push({ id, title: article.title, slug, status: shared.autoPublish ? 'published' : 'draft', coverGenerated, categoryId: plan.categoryId })
      shared.existingTitles.push(article.title)
    } catch (err) {
      errors.push({ topic, step, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { generated, errors, topicsFound: topics.length }
}

export async function runContentAgent({ db, env, taskId }: AgentRunOptions): Promise<AgentResult> {
  void taskId

  const settings = await getSiteSettings(db)

  const siteName       = (settings['site.name'] as string) || '我的站点'
  const writingStyle   = (settings['ai.writingStyle'] as string) || '专业实用'
  const count          = Number(settings['ai.content.count']) || 2
  const autoPublish    = Boolean(settings['ai.content.autoPublish'])
  const length         = (settings['ai.content.length'] as 'short' | 'medium' | 'long') || 'medium'
  const imageSource    = (settings['ai.content.imageSource'] as 'ai' | 'unsplash' | 'none') || 'none'
  const unsplashKey    = (settings['ai.content.unsplashKey'] as string) || ''
  const bodyImageSource = (settings['ai.content.bodyImageSource'] as 'none' | 'unsplash' | 'ai') || 'none'
  const siteTopics     = (settings['ai.content.siteTopics'] as string) || ''
  const targetAudience = (settings['ai.content.targetAudience'] as string) || ''
  const avoidTopics    = (settings['ai.content.avoidTopics'] as string) || ''
  const topicModel     = (settings['ai.topic.model'] as string) || DEFAULT_MODELS.topic
  const contentModel   = (settings['ai.content.model'] as string) || DEFAULT_MODELS.content
  const seoModel       = (settings['ai.seo.model'] as string) || DEFAULT_MODELS.seo
  const topicPrompt    = (settings['ai.topic.prompt'] as string) || ''
  const systemPrompt   = (settings['ai.content.systemPrompt'] as string) || ''
  const userPrompt     = (settings['ai.content.userPrompt'] as string) || ''
  const categoryPlans  = (settings['ai.content.categoryPlans'] as CategoryPlan[]) || []

  const { items: recent } = await getContents(db, { type: 'post', pageSize: 50 })
  const existingTitles = recent.map(p => p.title)

  const shared = {
    siteName, writingStyle, length, autoPublish,
    imageSource, unsplashKey, bodyImageSource, siteTopics,
    targetAudience, avoidTopics, topicModel, contentModel, seoModel,
    topicPrompt, systemPrompt, userPrompt, existingTitles,
  }

  const allGenerated: { id: string; title: string; slug: string; status: string; coverGenerated: boolean; categoryId: string | null }[] = []
  const allErrors: { topic: string; step: string; error: string }[] = []

  if (categoryPlans.length > 0) {
    // 按分类计划逐个执行
    for (const plan of categoryPlans) {
      const planCount = Math.max(1, plan.count || 1)
      const { generated, errors, topicsFound } = await runPlan(db, env, {
        categoryId: plan.categoryId,
        count: planCount,
        topicFocus: plan.topicFocus || siteTopics,
      }, shared)
      if (topicsFound === 0) {
        allErrors.push({ topic: '选题生成', step: `分类(${plan.categoryId})`, error: 'AI 未返回有效选题，请检查 Workers AI 配额' })
      }
      allGenerated.push(...generated)
      allErrors.push(...errors)
    }
  } else {
    // 无分类计划：用全局配置，不关联分类
    const { generated, errors, topicsFound } = await runPlan(db, env, {
      categoryId: null,
      count,
      topicFocus: siteTopics,
    }, shared)
    if (topicsFound === 0) {
      return { success: false, summary: 'AI 未返回有效选题，请检查 Workers AI 配额或稍后重试', data: { generated: 0 } }
    }
    allGenerated.push(...generated)
    allErrors.push(...errors)
  }

  const success = allGenerated.length > 0
  return {
    success,
    summary: `生成 ${allGenerated.length} 篇文章${allErrors.length ? `，${allErrors.length} 个子步骤错误` : ''}`,
    data: {
      generated: allGenerated.length,
      articles: allGenerated,
      errors: allErrors,
      config: { categoryPlans: categoryPlans.length, count, length, autoPublish, imageSource },
    },
  }
}

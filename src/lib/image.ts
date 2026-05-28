import { generateImage as aiGenerateImage } from '@/lib/ai'
import { getStorageDriver, generateMediaKey } from '@/lib/storage'
import { createMedia } from '@/lib/db'
import { generateId } from '@/lib/utils'

interface CoverImageResult {
  mediaId: string
  url: string
  source: 'ai' | 'unsplash'
}

// 通用兜底词池，随机取一个避免每次图片相同
const FALLBACK_QUERIES = [
  'technology', 'business', 'nature landscape', 'abstract', 'architecture',
  'people working', 'office', 'innovation', 'background', 'minimal',
]

function randomFallback(hint = ''): string {
  const pool = hint ? [hint, ...FALLBACK_QUERIES] : FALLBACK_QUERIES
  return pool[Math.floor(Math.random() * pool.length)]
}

// 提取英文词作为 Unsplash 查询（中文标题对 Unsplash 无效）
function buildUnsplashQuery(raw: string, fallback: string): string {
  // 只保留英文单词
  const englishOnly = raw.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = englishOnly.split(' ').filter(w => w.length > 2).slice(0, 4)
  return words.length >= 2 ? words.join(' ') : fallback
}

async function fetchUnsplashMeta(query: string, accessKey: string) {
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${accessKey}&_t=${Date.now()}`
  const res = await fetch(url, { cf: { cacheEverything: false } } as RequestInit)
  if (res.status === 404 || res.status === 422) return null  // 无结果，允许重试
  if (!res.ok) throw new Error(`Unsplash API 错误: ${res.status}`)
  return res.json() as Promise<{ urls: { regular: string }; width: number; height: number; alt_description: string | null; id: string }>
}

async function fetchUnsplashImage(
  query: string,
  accessKey: string,
  genericFallback = ''
): Promise<{ buffer: ArrayBuffer; width: number; height: number; alt: string; filename: string }> {
  // 尝试1：提取英文词查询
  const q1 = buildUnsplashQuery(query, randomFallback(genericFallback))
  let meta = await fetchUnsplashMeta(q1, accessKey)

  // 尝试2：随机兜底词（不同于尝试1，避免重复）
  if (!meta) {
    meta = await fetchUnsplashMeta(randomFallback(genericFallback), accessKey)
  }

  if (!meta) throw new Error(`Unsplash 未找到匹配图片（查询：${q1}）`)

  const imgRes = await fetch(meta.urls.regular, { cf: { cacheEverything: false } } as RequestInit)
  if (!imgRes.ok) throw new Error('Unsplash 图片下载失败')

  const buffer = await imgRes.arrayBuffer()
  return {
    buffer,
    width: meta.width,
    height: meta.height,
    alt: meta.alt_description || query,
    filename: `unsplash-${meta.id}.jpg`,
  }
}

export async function saveCoverImage(
  env: CloudflareEnv,
  options: {
    source: 'ai' | 'unsplash'
    query: string
    unsplashKey?: string
    genericFallback?: string
  }
): Promise<CoverImageResult> {
  let buffer: ArrayBuffer
  let filename: string
  let mimeType: string
  let width: number | null = null
  let height: number | null = null
  let alt: string | null = options.query

  if (options.source === 'unsplash') {
    if (!options.unsplashKey) throw new Error('未配置 Unsplash Access Key')
    const result = await fetchUnsplashImage(options.query, options.unsplashKey, options.genericFallback)
    buffer = result.buffer
    filename = result.filename
    mimeType = 'image/jpeg'
    width = result.width
    height = result.height
    alt = result.alt
  } else {
    buffer = await aiGenerateImage(env, `${options.query}，专业摄影风格，高清`)
    filename = `ai-cover-${Date.now()}.png`
    mimeType = 'image/png'
  }

  const suggestedKey = generateMediaKey(filename)
  const storage = await getStorageDriver(env)
  const { url, key: r2Key } = await storage.upload(suggestedKey, buffer, mimeType)

  const mediaId = generateId()
  await createMedia(env.DB, {
    id: mediaId,
    filename,
    r2_key: r2Key,
    url,
    mime_type: mimeType,
    size: buffer.byteLength,
    width,
    height,
    alt,
    ai_alt: null,
    uploaded_by: null,
  })

  return { mediaId, url, source: options.source }
}

// 为文章正文注入配图（在 H2 段落后插入图片，上传 R2 入媒体库）
export async function injectArticleImages(
  env: CloudflareEnv,
  content: string,
  topic: string,
  source: 'unsplash' | 'ai',
  unsplashKey: string,
  maxImages = 2,
  genericFallback = 'nature'
): Promise<{ content: string; errors: { heading: string; error: string }[] }> {
  const headingRegex = /^(#{2,3} .+)$/gm
  const matches = [...content.matchAll(headingRegex)]
  if (matches.length === 0) return { content, errors: [] }

  // Skip the first heading (usually intro) to avoid leading with an image
  const candidates = matches.length > 1 ? matches.slice(1) : matches
  const targets = candidates.slice(0, maxImages)
  let result = content
  const errors: { heading: string; error: string }[] = []

  for (const match of targets.reverse()) {
    const heading = match[1].replace(/^## /, '').trim()
    try {
      let imgBuffer: ArrayBuffer
      let filename: string
      let mimeType: string
      let imgAlt: string = heading || topic

      if (source === 'unsplash') {
        const fetched = await fetchUnsplashImage(heading || topic, unsplashKey, genericFallback)
        imgBuffer = fetched.buffer
        filename = fetched.filename
        mimeType = 'image/jpeg'
        imgAlt = fetched.alt || heading
      } else {
        imgBuffer = await aiGenerateImage(env, `${heading || topic}，插图风格，高清`)
        filename = `ai-body-${Date.now()}.png`
        mimeType = 'image/png'
      }

      const suggestedKey = generateMediaKey(filename)
      const storage = await getStorageDriver(env)
      const { url, key: r2Key } = await storage.upload(suggestedKey, imgBuffer, mimeType)
      const mediaId = generateId()
      await createMedia(env.DB, {
        id: mediaId, filename, r2_key: r2Key, url, mime_type: mimeType,
        size: imgBuffer.byteLength, width: null, height: null,
        alt: imgAlt, ai_alt: null, uploaded_by: null,
      })

      const idx = result.indexOf(match[1])
      if (idx !== -1) {
        result = result.slice(0, idx) + match[1] + `\n![${imgAlt}](${url})\n\n` + result.slice(idx + match[1].length)
      }
    } catch (err) {
      errors.push({ heading, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { content: result, errors }
}

// Workers AI 封装

export const DEFAULT_MODELS = {
  topic:   '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  content: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  seo:     '@cf/meta/llama-3.1-8b-instruct',
  image:   '@cf/black-forest-labs/flux-1-schnell',
} as const

export async function generateText(
  env: CloudflareEnv,
  prompt: string,
  systemPrompt?: string,
  maxTokens = 2048,
  model: string = DEFAULT_MODELS.content
): Promise<string> {
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const response = await env.AI.run(model as Parameters<typeof env.AI.run>[0], {
    messages,
    max_tokens: maxTokens,
    stream: false,
  } as Parameters<typeof env.AI.run>[1])

  if (typeof response === 'string') return response
  if (response instanceof ReadableStream) {
    const reader = (response as ReadableStream<Uint8Array>).getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    return new TextDecoder().decode(
      chunks.reduce((a, b) => { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c }, new Uint8Array())
    )
  }
  const result = response as { response?: unknown; result?: unknown }
  const r = result.response ?? result.result ?? ''
  return typeof r === 'string' ? r : JSON.stringify(r)
}

export async function generateImage(
  env: CloudflareEnv,
  prompt: string
): Promise<ArrayBuffer> {
  const response = await env.AI.run('@cf/black-forest-labs/flux-1-schnell' as Parameters<typeof env.AI.run>[0], {
    prompt,
    num_steps: 4,
  } as Parameters<typeof env.AI.run>[1])

  // Flux 返回 { image: string } base64，需解码为 ArrayBuffer
  const r = response as unknown as { image?: string } | ArrayBuffer
  if (r instanceof ArrayBuffer) return r
  if (r && typeof (r as { image?: string }).image === 'string') {
    const b64 = (r as { image: string }).image
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }
  throw new Error('图片生成返回格式未知')
}

export async function generateEmbedding(
  env: CloudflareEnv,
  text: string
): Promise<number[]> {
  const response = await env.AI.run('@cf/baai/bge-base-en-v1.5' as Parameters<typeof env.AI.run>[0], {
    text: [text],
  } as Parameters<typeof env.AI.run>[1]) as { data: number[][] }

  return response.data[0]
}

// ── 业务封装 ────────────────────────────────────────────────

export async function generateArticle(
  env: CloudflareEnv,
  options: {
    topic: string
    style?: string
    length?: 'short' | 'medium' | 'long'
    keywords?: string[]
    siteTopics?: string
    targetAudience?: string
    systemPrompt?: string
    userPromptTemplate?: string
    model?: string
  }
): Promise<{ title: string; content: string; excerpt: string; metaDescription: string }> {
  const lengthMap = { short: 600, medium: 1200, long: 2000 }
  const wordCount = lengthMap[options.length ?? 'medium']

  const defaultUserPrompt = `请围绕主题"{{topic}}"写一篇{{wordCount}}字左右的文章。
{{keywords}}{{style}}{{siteTopics}}{{audience}}
注意：正文中不要包含任何超链接或参考资料URL，不要编造网址。
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

  const userPrompt = (options.userPromptTemplate || defaultUserPrompt)
    .replace('{{topic}}', options.topic)
    .replace('{{wordCount}}', String(wordCount))
    .replace('{{keywords}}', options.keywords?.length ? `关键词：${options.keywords.join('、')}\n` : '')
    .replace('{{style}}', options.style ? `写作风格：${options.style}\n` : '')
    .replace('{{siteTopics}}', options.siteTopics ? `网站主题：${options.siteTopics}\n` : '')
    .replace('{{audience}}', options.targetAudience ? `目标读者：${options.targetAudience}\n` : '')

  const sysPrompt = options.systemPrompt || '你是一位专业的内容创作者，擅长SEO友好的内容写作。请严格按照指定格式输出。不要在正文中插入任何超链接或参考资料URL，不要编造网址。'
  const raw = await generateText(env, userPrompt, sysPrompt, 4096, options.model ?? DEFAULT_MODELS.content)

  const extract = (tag: string, next: string) => {
    const re = new RegExp(`===\\s*${tag}\\s*===([\\s\\S]*?)===\\s*${next}\\s*===`, 'i')
    return raw.match(re)?.[1]?.trim() ?? ''
  }

  const title = extract('TITLE', 'EXCERPT') || options.topic
  const excerpt = extract('EXCERPT', 'META') || extract('EXCERPT', 'CONTENT')
  const metaDescription = extract('META', 'CONTENT') || excerpt
  // END 标记有时被模型省略，降级为取 CONTENT 之后的全部内容
  const content = extract('CONTENT', 'END')
    || raw.match(/===\s*CONTENT\s*===([\s\S]*)/i)?.[1]?.trim()
    || raw

  return { title, content, excerpt, metaDescription }
}

export async function generateSEOMeta(
  env: CloudflareEnv,
  content: { title: string; content: string },
  model?: string
): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
  const prompt = `根据以下文章生成SEO信息：
标题：${content.title}
正文摘要：${content.content.slice(0, 500)}

严格按以下格式输出：
===METATITLE===
（SEO标题，60字以内，一行）
===METADESC===
（SEO描述，155字以内，一行）
===KEYWORDS===
（关键词，用逗号分隔，一行）
===END===`

  const raw = await generateText(env, prompt, undefined, 512, model ?? DEFAULT_MODELS.seo)
  const extract = (tag: string, next: string) => {
    const re = new RegExp(`===\\s*${tag}\\s*===([\\s\\S]*?)===\\s*${next}\\s*===`, 'i')
    return raw.match(re)?.[1]?.trim() ?? ''
  }
  const extractToEnd = (tag: string) =>
    raw.match(new RegExp(`===\\s*${tag}\\s*===([\\s\\S]*)`, 'i'))?.[1]?.trim() ?? ''

  const metaTitle = extract('METATITLE', 'METADESC') || content.title
  const metaDescription = extract('METADESC', 'KEYWORDS') || extract('METADESC', 'END') || extractToEnd('METADESC')
  const keywordsRaw = extract('KEYWORDS', 'END') || extractToEnd('KEYWORDS')
  return {
    metaTitle,
    metaDescription,
    keywords: keywordsRaw.split(/[,，]/).map(k => k.trim()).filter(Boolean),
  }
}

export async function generateImageAlt(
  env: CloudflareEnv,
  imageUrl: string
): Promise<string> {
  const prompt = `请用简洁的中文描述这张图片的内容，用于图片的alt属性，不超过100字。`
  return generateText(env, prompt)
}

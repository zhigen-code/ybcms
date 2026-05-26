export type ContentStatus = 'draft' | 'published' | 'scheduled'
export type UserRole = 'admin' | 'editor' | 'author'
export type AITaskType = 'content' | 'seo' | 'review' | 'design' | 'analytics' | 'setup'
export type AITaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface ContentType {
  id: string
  name: string
  slug: string
  icon: string
  has_timeline: boolean
  has_author: boolean
  has_category: boolean
  has_tag: boolean
  has_comment: boolean
  fields: CustomFieldDef[]
  is_builtin: boolean
  created_at: number
}

export interface CustomFieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'image' | 'images' | 'url' | 'relation'
  options?: string[]           // select/multiselect 选项
  required?: boolean
  default?: unknown
}

export interface Content {
  id: string
  type: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  status: ContentStatus
  author_id: string | null
  cover_image: string | null
  published_at: number | null
  scheduled_at: number | null
  created_at: number
  updated_at: number
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  ai_generated: boolean
  ai_reviewed: boolean
  // 页面层级（page 类型专用）
  parent_id: string | null
  sort_order: number
  // 关联数据（查询时填充）
  author?: User
  categories?: Category[]
  tags?: Tag[]
  fields?: Record<string, unknown>
  parent?: Pick<Content, 'id' | 'title' | 'slug'>
}

export interface Category {
  id: string
  content_type: string
  name: string
  slug: string
  parent_id: string | null
  description: string | null
  cover_image: string | null
  created_at: number
  sort_order: number
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: number
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  role: UserRole
  last_login: number | null
  created_at: number
}

export interface Media {
  id: string
  filename: string
  r2_key: string
  url: string
  mime_type: string
  size: number
  width: number | null
  height: number | null
  alt: string | null
  ai_alt: string | null
  uploaded_by: string | null
  created_at: number
}

export interface FormField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'number' | 'url'
  placeholder?: string
  required: boolean
  options?: string[]
}

export interface Form {
  id: string
  name: string
  slug: string
  description: string
  fields: FormField[]
  webhook_url: string
  webhook_headers: Record<string, string>
  webhook_field_map: Record<string, string>
  submit_message: string
  status: 'active' | 'paused'
  created_at: number
  updated_at: number
}

export interface FormSubmission {
  id: string
  form_id: string
  data: Record<string, unknown>
  source_url: string
  ip: string
  webhook_status: 'pending' | 'sent' | 'failed' | 'skipped'
  webhook_sent_at: number | null
  webhook_response: string
  created_at: number
}

export interface AITask {
  id: string
  type: AITaskType
  status: AITaskStatus
  input: Record<string, unknown>
  output: unknown
  error: string | null
  created_at: number
  completed_at: number | null
}

export interface CategoryPlan {
  categoryId: string
  count: number
  topicFocus: string
  weight?: number
}

export interface SiteSettings {
  'site.name': string
  'site.description': string
  'site.url': string
  'site.logo': string | null
  'site.favicon': string | null
  'theme.active': string
  'theme.variables': Record<string, string>
  'theme.customCss': string
  'theme.headerHtml': string
  'theme.footerHtml': string
  'theme.customJs': string
  'nav.main': NavItem[]
  'nav.footer': NavItem[]
  'seo.titleTemplate': string
  'seo.robots': string
  'seo.defaultOgImage': string
  'seo.googleVerification': string
  'seo.home.title': string
  'seo.home.description': string
  'seo.home.ogImage': string
  'seo.categoryList.title': string
  'seo.categoryList.description': string
  'ai.writingStyle': string
  // 内容 Agent
  'ai.content.count': number
  'ai.content.autoPublish': boolean
  'ai.content.length': 'short' | 'medium' | 'long'
  'ai.content.categoryPlans': CategoryPlan[]
  'ai.content.imageSource': 'ai' | 'unsplash' | 'none'
  'ai.content.bodyImageSource': 'none' | 'unsplash' | 'ai'
  'ai.content.unsplashKey': string
  'ai.content.siteTopics': string
  'ai.content.targetAudience': string
  'ai.content.avoidTopics': string
  // 模型配置
  'ai.topic.model': string
  'ai.content.model': string
  'ai.seo.model': string
  // 提示词
  'ai.topic.prompt': string
  'ai.content.systemPrompt': string
  'ai.content.userPrompt': string
  // SEO Agent（保留旧键兼容历史数据）
  'ai.seo.batchSize': number
  'ai.seo.priorityAI': boolean
  // 审核 Agent
  'ai.review.batchSize': number
  'ai.review.priorityUnreviewed': boolean
  'ai.review.fixMeta': boolean
  'ai.review.fixExcerpt': boolean
  'ai.review.model': string
  'ai.trigger.token': string
  // 发布计划
  'ai.schedule.enabled': boolean
  'ai.schedule.runMin': number
  'ai.schedule.runMax': number
  'ai.schedule.dailyMax': number
  'site.showAiBadge': boolean
  'setup.completed': boolean
  // 存储驱动
  'storage.driver': 'r2' | 's3'
  'storage.s3.endpoint': string
  'storage.s3.bucket': string
  'storage.s3.region': string
  'storage.s3.public_url': string
}

export interface NavItem {
  id: string
  label: string
  url: string
  target?: '_blank' | '_self'
  children?: NavItem[]
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ListResult<T> {
  items: T[]
  pagination: Pagination
}

export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  permissions: string[]
  created_at: number
  last_used_at: number | null
}

export interface Link {
  id: string
  name: string
  url: string
  description: string | null
  logo: string | null
  sort_order: number
  status: 'active' | 'hidden'
  created_at: number
}

export interface InitBasicInfo {
  siteName: string
  language: 'zh' | 'en' | 'bilingual'
  siteType: 'showcase' | 'marketing' | 'news' | 'ecommerce'
  industry: string
  targetAudience: string
  brandColor?: string
}

export interface InitPlan {
  siteSettings: { name: string; description: string; url?: string }
  categories: { name: string; slug: string; description?: string }[]
  navigation: { label: string; url: string }[]
  aiConfig: { siteTopics: string; targetAudience: string; writingStyle: string }
  importItems: { title: string; content: string; excerpt: string; categorySlug?: string }[]
  summary: string
}

import type { ComponentType } from 'react'
import type {
  ThemeLayoutProps, ThemeHomeProps, ThemePostProps, ThemePageProps,
  ThemeArchiveProps, ThemeAuthorProps, ThemeSearchProps, ThemeLinksProps,
} from '@/types/theme'
import type { CustomFieldDef } from '@/types'

export interface ThemeMeta {
  id: string
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  preview: string | null
  variables: Record<string, string>
}

/** Content type that a theme needs provisioned when activated */
export interface ThemeContentTypeDef {
  id: string
  name: string
  slug: string
  icon: string
  has_timeline?: boolean
  has_author?: boolean
  has_category?: boolean
  has_tag?: boolean
  fields: CustomFieldDef[]
}

export interface ThemeModule {
  Layout: ComponentType<ThemeLayoutProps>
  Home: ComponentType<ThemeHomeProps>
  Post: ComponentType<ThemePostProps>
  Page: ComponentType<ThemePageProps>
  Category: ComponentType<ThemeArchiveProps>
  Tag: ComponentType<ThemeArchiveProps>
  Author: ComponentType<ThemeAuthorProps>
  Search: ComponentType<ThemeSearchProps>
  Links: ComponentType<ThemeLinksProps>
}

// ── Theme Registry ────────────────────────────────────────────────────────────
// Adding a new theme requires only editing this file:
//   1. Create src/themes/{id}/ with all required components
//   2. Add one entry to REGISTRY below (contentTypes is optional)

import defaultConfig from '@/themes/default/theme.config'
import fertilityConfig, { contentTypes as fertilityContentTypes } from '@/themes/fertility/theme.config'

const REGISTRY: Array<{
  meta: ThemeMeta
  contentTypes?: ThemeContentTypeDef[]
  load: () => Promise<ThemeModule>
}> = [
  {
    meta: {
      id: defaultConfig.id,
      name: defaultConfig.name,
      version: defaultConfig.version,
      author: defaultConfig.author,
      variables: defaultConfig.variables,
      description: '简洁现代的博客主题，适合内容创作者和个人站点',
      tags: ['博客', '简洁', '响应式'],
      preview: null,
    },
    load: () => import('@/themes/default') as Promise<ThemeModule>,
  },
  {
    meta: {
      id: fertilityConfig.id,
      name: fertilityConfig.name,
      version: fertilityConfig.version,
      author: fertilityConfig.author,
      variables: fertilityConfig.variables,
      description: '专为生殖中心设计，温暖专业，支持医生、服务、患者故事等内容类型',
      tags: ['医疗', '生殖中心', '专业'],
      preview: null,
    },
    contentTypes: fertilityContentTypes,
    load: () => import('@/themes/fertility') as Promise<ThemeModule>,
  },
]

// ── Public API ────────────────────────────────────────────────────────────────

export const themes: ThemeMeta[] = REGISTRY.map(r => r.meta)

export function getThemeById(id: string): ThemeMeta {
  return themes.find(t => t.id === id) ?? themes[0]
}

export function getThemeContentTypes(themeId: string): ThemeContentTypeDef[] {
  return REGISTRY.find(r => r.meta.id === themeId)?.contentTypes ?? []
}

export async function loadTheme(themeId?: string | null): Promise<ThemeModule> {
  const id = themeId || 'default'
  const entry = REGISTRY.find(r => r.meta.id === id) ?? REGISTRY[0]
  return entry.load()
}

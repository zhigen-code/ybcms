import type { Content, SiteSettings, Category, Tag, User, Form } from '@/types'

export interface ThemePagination {
  page: number; totalPages: number; total: number; pageSize: number
}

export interface ThemeLayoutProps {
  children: React.ReactNode
  settings: SiteSettings
}

export interface ThemeHomeProps {
  posts: Content[]
  settings: SiteSettings
  categories?: Category[]
  categoryMap?: Record<string, Category>
  pagination?: ThemePagination
  tags?: (Tag & { count: number })[]
}

export interface ThemePostProps {
  post: Content
  settings: SiteSettings
  related?: Content[]
  embeddedForms?: Form[]
}

export interface ThemePageProps {
  post: Content
  settings: SiteSettings
  embeddedForms?: Form[]
  parentPage?: Content | null
  childPages?: Content[]
}

export interface ThemeArchiveProps {
  title: string
  slug: string
  description?: string | null
  coverImage?: string | null
  posts: Content[]
  pagination: ThemePagination
  siblings?: Category[] | Tag[]
}

export interface ThemeAuthorProps {
  author: User
  posts: Content[]
  pagination: ThemePagination
}

export interface ThemeSearchProps {
  query: string
  posts: Content[]
  pagination: ThemePagination
  categoryMap: Record<string, Category>
}

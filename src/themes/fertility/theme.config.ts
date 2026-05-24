import type { ThemeContentTypeDef } from '@/themes/registry'
import type { NavItem } from '@/types'

const themeConfig = {
  id: 'fertility',
  name: '生殖中心',
  version: '1.0.0',
  author: 'CMS',
  variables: {
    '--color-primary': '#c17b8a',
    '--color-primary-hover': '#a8627a',
    '--color-bg': '#ffffff',
    '--color-bg-secondary': '#fdf8f8',
    '--color-text': '#1a1a2e',
    '--color-text-secondary': '#6b7280',
    '--color-border': '#ede9e9',
    '--font-heading': '"Noto Serif SC", Georgia, serif',
    '--font-body': '"Noto Sans SC", system-ui, sans-serif',
    '--radius': '10px',
    '--max-width': '1180px',
  },
}

export const contentTypes: ThemeContentTypeDef[] = [
  {
    id: 'doctor',
    name: '医生',
    slug: 'doctor',
    icon: '医',
    has_timeline: false,
    has_author: false,
    has_category: true,
    has_tag: false,
    fields: [
      { key: 'position', label: '职称', type: 'text', required: true },
      { key: 'department', label: '所属科室', type: 'text' },
      { key: 'years_experience', label: '从业年限', type: 'number' },
      { key: 'specialties', label: '专长方向', type: 'textarea' },
      { key: 'education', label: '教育背景', type: 'textarea' },
      { key: 'appointment_url', label: '预约链接', type: 'url' },
    ],
  },
  {
    id: 'service',
    name: '诊疗服务',
    slug: 'service',
    icon: '诊',
    has_timeline: false,
    has_author: false,
    has_category: true,
    has_tag: false,
    fields: [
      { key: 'subtitle', label: '服务副标题', type: 'text' },
      { key: 'suitable_for', label: '适合人群', type: 'textarea' },
      { key: 'duration', label: '疗程周期', type: 'text' },
      { key: 'price_range', label: '费用区间', type: 'text' },
      { key: 'success_rate', label: '参考成功率', type: 'text' },
      { key: 'featured', label: '首页推荐', type: 'boolean', default: false },
      { key: 'sort_order', label: '排序', type: 'number', default: 0 },
    ],
  },
  {
    id: 'testimonial',
    name: '患者故事',
    slug: 'testimonial',
    icon: '患',
    has_timeline: false,
    has_author: false,
    has_category: false,
    has_tag: false,
    fields: [
      { key: 'nickname', label: '匿名昵称', type: 'text', required: true },
      { key: 'treatment_type', label: '治疗类型', type: 'select', options: ['试管婴儿', '人工授精', '冻卵', '供卵', '其他'] },
      { key: 'duration_months', label: '治疗周期（月）', type: 'number' },
      { key: 'rating', label: '满意度', type: 'select', options: ['五星', '四星', '三星'] },
      { key: 'featured', label: '首页展示', type: 'boolean', default: false },
    ],
  },
]

export const defaultNav: NavItem[] = [
  { id: 'nav-service',     label: '诊疗服务', url: '/service'     },
  { id: 'nav-doctor',      label: '医生团队', url: '/doctor'      },
  { id: 'nav-testimonial', label: '患者故事', url: '/testimonial' },
  { id: 'nav-category',    label: '科普资讯', url: '/category'    },
]

export default themeConfig

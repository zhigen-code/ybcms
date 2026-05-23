export const dynamic = 'force-dynamic'

import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getContents, getContentType } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ContentListClient from './_components/ContentListClient'
import { PlusIcon } from '@/components/icons'


const PAGE_SIZE = 20

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ContentListPage({ params, searchParams }: Props) {
  const { type } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const { env } = getCloudflareContext()

  const contentType = await getContentType(env.DB, type)
  if (!contentType) notFound()

  const { items, pagination } = await getContents(env.DB, { type, page, pageSize: PAGE_SIZE })

  return (
    <>
    <style>{`
      .cl-pg { padding: 28px 32px 48px; max-width: 860px; margin: 0 auto; }
      .cl-pg-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 12px; }
      @media(max-width:640px) { .cl-pg { padding: 16px 16px 48px; } }
    `}</style>
    <div className="cl-pg">
      <div className="cl-pg-hd">
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#18181b', letterSpacing: '-0.02em', margin: 0 }}>
            {contentType.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#71717a', marginTop: '4px' }}>共 {pagination.total} 条</p>
        </div>
        <Link href={`/admin/${type}/new`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', background: '#18181b', color: '#fff',
          borderRadius: '8px', textDecoration: 'none',
          fontSize: '13px', fontWeight: 500, flexShrink: 0,
        }}>
          <PlusIcon size={14} />
          新建{contentType.name}
        </Link>
      </div>
      <ContentListClient
        initialItems={items}
        type={type}
        typeName={contentType.name}
        pagination={pagination}
      />
    </div>
    </>
  )
}

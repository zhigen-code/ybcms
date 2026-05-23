import { NextRequest, NextResponse } from 'next/server'

// Named first-level route segments with dedicated Next.js route handlers
const NAMED_ROUTES = new Set([
  'post', 'category', 'tag', 'author', 'search', 'links', 'form',
  'content-type', 'admin', 'api',
])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('cms_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  // Rewrite /[type]/[slug] → /content-type/[type]/[slug] for custom content types
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 2 && !NAMED_ROUTES.has(parts[0])) {
    const url = request.nextUrl.clone()
    url.pathname = `/content-type/${parts[0]}/${parts[1]}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    // All 2-segment paths — middleware logic filters named routes internally
    '/:type/:slug',
  ],
}

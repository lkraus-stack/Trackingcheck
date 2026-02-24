import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Auth routes sollten immer zugänglich sein
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  // API auth routes sollten immer zugänglich sein
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Protected routes - nur für eingeloggte User
  const protectedPaths = ['/app', '/dashboard', '/settings', '/profile', '/dashboard/admin']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    const hasSessionCookie =
      req.cookies.get('authjs.session-token') ||
      req.cookies.get('__Secure-authjs.session-token')

    if (!hasSessionCookie) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Public routes bleiben zugänglich
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (imgs, svgs, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

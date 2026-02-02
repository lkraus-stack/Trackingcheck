import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"
import { isAdminEmail } from "@/lib/auth/admin"

export default auth(async (req) => {
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
  const protectedPaths = ['/dashboard', '/settings', '/profile']
  const adminPaths = ['/dashboard/admin']
  
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath) {
    // Prüfe Session - bei Database Sessions kann es sein, dass req.auth nicht immer verfügbar ist
    // Also prüfen wir zusätzlich auf Session-Cookie
    const session = req.auth
    const hasSessionCookie = req.cookies.get('authjs.session-token') || req.cookies.get('__Secure-authjs.session-token')
    
    // Wenn keine Session und kein Session-Cookie vorhanden, redirect zu Sign-In
    if (!session && !hasSessionCookie) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Admin routes - nur für Admins
  if (isAdminPath) {
    const session = req.auth
    if (!session?.user) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    const isAdmin = session.user.role === 'admin' || isAdminEmail(session.user.email)
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Public routes bleiben zugänglich
  return NextResponse.next()
})

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

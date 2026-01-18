import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"

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
  
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
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

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/approve', '/api/auth/login', '/api/approval']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow public routes and static files
  if (
    isPublicRoute ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  // Check for auth token
  const authToken = request.cookies.get('auth-token')

  if (!authToken || authToken.value !== 'authenticated') {
    // Redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

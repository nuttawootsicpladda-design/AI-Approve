import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/approve', '/api/auth/login', '/api/auth/callback', '/api/approval']

// Routes that require specific roles
const roleRoutes: { path: string; roles: string[] }[] = [
  { path: '/dashboard', roles: ['manager', 'admin'] },
  { path: '/api/dashboard', roles: ['manager', 'admin'] },
  { path: '/admin', roles: ['admin'] },
  { path: '/api/admin', roles: ['admin'] },
]

function getUserRoleFromCookie(request: NextRequest): string | null {
  const userInfo = request.cookies.get('user-info')
  if (!userInfo) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(userInfo.value))
    return parsed.role || null
  } catch {
    return null
  }
}

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
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access
  const matchedRoute = roleRoutes.find(r => pathname.startsWith(r.path))
  if (matchedRoute) {
    const userRole = getUserRoleFromCookie(request)
    if (!userRole || !matchedRoute.roles.includes(userRole)) {
      // Redirect to home if insufficient role
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

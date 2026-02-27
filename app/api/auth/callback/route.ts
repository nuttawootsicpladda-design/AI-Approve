import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findOrCreateUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    const loginUrl = new URL('/login?error=access_denied', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (!code) {
    const loginUrl = new URL('/login?error=no_code', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID!
  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/callback`

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email',
        }),
      }
    )

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      const loginUrl = new URL('/login?error=token_exchange_failed', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const tokenData = await tokenResponse.json()
    const idToken = tokenData.id_token

    if (!idToken) {
      const loginUrl = new URL('/login?error=no_id_token', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Decode the id_token JWT payload (base64url)
    const payloadBase64 = idToken.split('.')[1]
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8')
    const payload = JSON.parse(payloadJson)

    const userEmail = payload.preferred_username || payload.email || ''
    const userName = payload.name || ''

    // Find or create user in Supabase, get role
    const userRole = await findOrCreateUser(userEmail, userName)

    // Set auth cookie (compatible with existing middleware)
    const cookieStore = await cookies()
    cookieStore.set('auth-token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // Store user info + role for display and access control
    cookieStore.set('user-info', JSON.stringify({ email: userEmail, name: userName, role: userRole }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.redirect(new URL('/', request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    const loginUrl = new URL('/login?error=callback_failed', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

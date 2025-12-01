import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Simple hardcoded credentials
const VALID_EMAIL = 'procurement.noreply@icpladda.com'
const VALID_PASSWORD = 'Proc2025'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check credentials
    if (email.toLowerCase() !== VALID_EMAIL.toLowerCase() || password !== VALID_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}

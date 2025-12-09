import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, message } = body

    if (!token || !message) {
      return NextResponse.json(
        { success: false, error: 'Token and message are required' },
        { status: 400 }
      )
    }

    // Send to Line Notify API
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.message || 'Failed to send Line notification' },
        { status: response.status }
      )
    }
  } catch (error: any) {
    console.error('Line Notify error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notification' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, message } = body

    console.log('Line Notify request received:', { hasToken: !!token, messageLength: message?.length })

    if (!token || !message) {
      console.error('Line Notify: Missing token or message')
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

    const resultText = await response.text()
    console.log('Line Notify API response:', { status: response.status, body: resultText })

    let result
    try {
      result = JSON.parse(resultText)
    } catch {
      result = { message: resultText }
    }

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      const errorMsg = result.message || `Line API error: ${response.status}`
      console.error('Line Notify failed:', errorMsg)
      return NextResponse.json(
        { success: false, error: errorMsg },
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

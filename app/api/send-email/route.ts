import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/microsoft-graph'
import { saveRecord } from '@/lib/db'
import { POItem, SharePointFileInfo } from '@/lib/types'

// Increase body size limit and timeout for large PO data
export const maxDuration = 60 // 60 seconds timeout
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      cc,
      subject,
      htmlBody,
      items,
      fileName,
      attachments,
      sharePointFiles,
      approvedFolderPath,
      senderEmail,
    } = body

    if (!to || !subject || !htmlBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate total
    const total = items.reduce((sum: number, item: POItem) => {
      const usd = typeof item.usd === 'number' ? item.usd : parseFloat(String(item.usd))
      return sum + (isNaN(usd) ? 0 : usd)
    }, 0)

    // Save to history first to get record ID for approval token
    console.log('Saving record to database...', { fileName, to, cc, total })
    const record = await saveRecord({
      fileName: fileName || 'Unknown',
      items,
      total,
      sentTo: to,
      sentCc: cc || undefined,
      sentFrom: senderEmail || process.env.EMAIL_SENDER || '',
      sentAt: new Date().toISOString(),
      status: 'sent',
      approvalStatus: 'pending',
      sharePointFiles: sharePointFiles as SharePointFileInfo[] | undefined,
      approvedFolderPath,
    })
    console.log('Record saved successfully:', record.id)

    // Send email via Microsoft Graph (no approval buttons - user will Reply All manually)
    await sendEmail({
      to,
      cc,
      subject,
      htmlBody,
      attachments,
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
    })
  } catch (error: any) {
    console.error('Send email API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

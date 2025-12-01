import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/microsoft-graph'
import { saveRecord } from '@/lib/db'
import { POItem, SharePointFileInfo } from '@/lib/types'
import { generateApprovalToken, getApprovalUrl } from '@/lib/approval'

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
    const record = await saveRecord({
      fileName: fileName || 'Unknown',
      items,
      total,
      sentTo: to,
      sentFrom: senderEmail || process.env.EMAIL_SENDER || '',
      sentAt: new Date().toISOString(),
      status: 'sent',
      approvalStatus: 'pending',
      sharePointFiles: sharePointFiles as SharePointFileInfo[] | undefined,
      approvedFolderPath,
    })

    // Generate approval token
    const approvalToken = generateApprovalToken(record.id)
    const approveUrl = getApprovalUrl(approvalToken, 'approve')
    const rejectUrl = getApprovalUrl(approvalToken, 'reject')

    // Add approval buttons to email
    const approvalButtonsHtml = `
      <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: bold;">กรุณาอนุมัติหรือปฏิเสธคำขอนี้</p>
        <div style="display: inline-block;">
          <a href="${approveUrl}"
             style="display: inline-block; padding: 12px 32px; margin: 8px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ✓ อนุมัติ (Approve)
          </a>
          <a href="${rejectUrl}"
             style="display: inline-block; padding: 12px 32px; margin: 8px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            ✗ ไม่อนุมัติ (Reject)
          </a>
        </div>
        <p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
          หรือคลิกที่ลิงก์ด้านล่าง:<br>
          อนุมัติ: <a href="${approveUrl}">${approveUrl}</a><br>
          ไม่อนุมัติ: <a href="${rejectUrl}">${rejectUrl}</a>
        </p>
      </div>
    `

    // Combine original HTML with approval buttons
    const fullHtmlBody = htmlBody + approvalButtonsHtml

    // Send email via Microsoft Graph
    await sendEmail({
      to,
      cc,
      subject,
      htmlBody: fullHtmlBody,
      attachments,
    })

    // Update record with approval token
    const { updateRecord } = await import('@/lib/db')
    await updateRecord(record.id, { approvalToken })

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

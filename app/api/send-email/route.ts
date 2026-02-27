import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/microsoft-graph'
import { saveRecord, updateRecord } from '@/lib/db'
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
      createdBy,
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
      createdBy: createdBy || senderEmail || '',
    })
    console.log('Record saved successfully:', record.id)

    // Generate approval token and URLs
    const token = generateApprovalToken(record.id)
    const approveUrl = getApprovalUrl(token, 'approve')
    const rejectUrl = getApprovalUrl(token, 'reject')

    // Save token to record
    await updateRecord(record.id, { approvalToken: token })

    // Build email with approval buttons appended
    const approvalButtonsHtml = `
      <div style="text-align:center; margin-top:32px; padding:24px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
        <p style="margin:0 0 16px; font-size:16px; font-weight:bold; color:#1e293b;">กรุณาพิจารณาอนุมัติ PO นี้</p>
        <div style="display:inline-block;">
          <a href="${approveUrl}" style="display:inline-block; padding:12px 32px; margin:0 8px; background-color:#22c55e; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;">✅ อนุมัติ</a>
          <a href="${rejectUrl}" style="display:inline-block; padding:12px 32px; margin:0 8px; background-color:#ef4444; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;">❌ ไม่อนุมัติ</a>
        </div>
        <p style="margin:16px 0 0; font-size:12px; color:#94a3b8;">ลิงก์นี้ใช้ได้ภายใน 7 วัน</p>
      </div>
    `

    const fullHtmlBody = htmlBody + approvalButtonsHtml

    // Send email via Microsoft Graph with approval buttons
    await sendEmail({
      to,
      cc,
      subject,
      htmlBody: fullHtmlBody,
      attachments,
    })

    // NOTE: SharePoint files are NOT moved here.
    // Files will only be moved when the PO is approved (in /api/approval or /api/dashboard/approve).

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

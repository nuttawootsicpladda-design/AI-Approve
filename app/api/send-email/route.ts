import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/microsoft-graph'
import { saveRecord } from '@/lib/db'
import { POItem, SharePointFileInfo } from '@/lib/types'
import { initializeApproval } from '@/lib/approval-flow'
import { generateApprovalToken, getApprovalUrl } from '@/lib/approval'
import { wrapEmailLayout, approvalButtons } from '@/lib/email-template'

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

    // Save to history first to get record ID
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

    // Try multi-level approval initialization
    const approvalInit = await initializeApproval(record.id, total)

    let approvalButtonsHtml: string
    let emailTo = to

    if (approvalInit) {
      // Multi-level: use configured approver
      emailTo = approvalInit.approverEmail
      const maxLevel = approvalInit.maxLevel

      approvalButtonsHtml = approvalButtons({
        approveUrl: approvalInit.approveUrl,
        rejectUrl: approvalInit.rejectUrl,
        levelText: `การอนุมัติ Level 1 of ${maxLevel} (${approvalInit.levelName})`,
      })
    } else {
      // Fallback: no levels configured — use original single-level behavior
      const token = generateApprovalToken(record.id, 1)
      const approveUrl = getApprovalUrl(token, 'approve')
      const rejectUrl = getApprovalUrl(token, 'reject')
      const { updateRecord } = await import('@/lib/db')
      await updateRecord(record.id, { approvalToken: token })

      approvalButtonsHtml = approvalButtons({
        approveUrl,
        rejectUrl,
      })
    }

    // Wrap the PO table + approval buttons in ICP branded layout
    const fullHtmlBody = wrapEmailLayout(`
      <div style="padding:28px 32px; color:#14181F; font-size:14px; line-height:1.7;">
        ${htmlBody}
        ${approvalButtonsHtml}
      </div>
    `)

    // Send email to the approver (or original recipient if no levels configured)
    await sendEmail({
      to: emailTo,
      cc,
      subject,
      htmlBody: fullHtmlBody,
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

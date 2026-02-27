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

    if (!subject || !htmlBody) {
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

    // Initialize approval to determine who to send to
    // We need to do this before saving so we know the approver email
    const { getActiveApprovalLevels } = await import('@/lib/db')
    const activeLevels = await getActiveApprovalLevels()

    if (activeLevels.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้ตั้งค่าระดับการอนุมัติ กรุณาตั้งค่าใน Admin ก่อน' },
        { status: 400 }
      )
    }

    const level1Approver = activeLevels[0].approverEmail

    // Save to history first to get record ID
    console.log('Saving record to database...', { fileName, total })
    const record = await saveRecord({
      fileName: fileName || 'Unknown',
      items,
      total,
      sentTo: level1Approver,
      sentFrom: senderEmail || process.env.EMAIL_SENDER || '',
      sentAt: new Date().toISOString(),
      status: 'sent',
      approvalStatus: 'pending',
      sharePointFiles: sharePointFiles as SharePointFileInfo[] | undefined,
      approvedFolderPath,
      createdBy: createdBy || senderEmail || '',
    })
    console.log('Record saved successfully:', record.id)

    // Initialize multi-level approval
    const approvalInit = await initializeApproval(record.id, total)

    let approvalButtonsHtml: string
    let emailTo: string

    if (approvalInit) {
      emailTo = approvalInit.approverEmail
      const maxLevel = approvalInit.maxLevel

      approvalButtonsHtml = approvalButtons({
        approveUrl: approvalInit.approveUrl,
        rejectUrl: approvalInit.rejectUrl,
        levelText: `การอนุมัติ Level 1 of ${maxLevel} (${approvalInit.levelName})`,
      })
    } else {
      // Fallback: use level 1 approver directly
      emailTo = level1Approver
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

    // Send email to the configured approver
    await sendEmail({
      to: emailTo,
      subject,
      htmlBody: fullHtmlBody,
      attachments,
    })

    return NextResponse.json({
      success: true,
      recordId: record.id,
      sentTo: emailTo,
    })
  } catch (error: any) {
    console.error('Send email API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

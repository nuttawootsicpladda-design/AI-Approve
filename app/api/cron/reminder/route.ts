import { NextRequest, NextResponse } from 'next/server'
import { getPendingRecordsForReminder, updateRecord, getApprovalStepsForPO } from '@/lib/db'
import { PORecord } from '@/lib/types'
import { sendEmail } from '@/lib/microsoft-graph'
import { generateApprovalToken, getApprovalUrl } from '@/lib/approval'
import {
  wrapEmailLayout,
  emailHeader,
  emailCurrency,
  miniApprovalButtons,
  levelBadge,
  pendingBadge,
  ctaButton,
  EMAIL_COLORS,
} from '@/lib/email-template'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const key = bearerToken || request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('key')

  if (!CRON_SECRET || key !== CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const records = await getPendingRecordsForReminder()

    if (records.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending records to remind', count: 0 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const now = new Date().toISOString()

    // Group records by current approver (from approval_steps) and by sender
    const byApprover = new Map<string, { record: PORecord; level: number; maxLevel: number }[]>()
    const bySender = new Map<string, { record: PORecord; currentLevel: number; maxLevel: number; approverEmail: string }[]>()

    for (const record of records) {
      const currentLevel = record.currentApprovalLevel || 1
      const maxLevel = record.maxApprovalLevel || 1

      // Find the current approver from approval steps
      let currentApproverEmail = record.sentTo
      const steps = await getApprovalStepsForPO(record.id)
      const pendingStep = steps.find(s => s.status === 'pending')
      if (pendingStep) {
        currentApproverEmail = pendingStep.approverEmail
      }

      // Group by approver
      const approverList = byApprover.get(currentApproverEmail) || []
      approverList.push({ record, level: currentLevel, maxLevel })
      byApprover.set(currentApproverEmail, approverList)

      // Group by sender
      const senderKey = record.createdBy || record.sentFrom
      if (senderKey) {
        const senderList = bySender.get(senderKey) || []
        senderList.push({ record, currentLevel, maxLevel, approverEmail: currentApproverEmail })
        bySender.set(senderKey, senderList)
      }
    }

    let emailsSent = 0

    // Send reminder to each approver
    for (const [approverEmail, items] of Array.from(byApprover)) {
      try {
        const poListHtml = items.map(({ record: r, level, maxLevel }) => {
          const token = generateApprovalToken(r.id, level)
          const approveUrl = getApprovalUrl(token, 'approve')
          const rejectUrl = getApprovalUrl(token, 'reject')
          const total = Number(r.total) || 0
          const sentDate = new Date(r.sentAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
          })

          return `
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${r.fileName} ${levelBadge(level, maxLevel)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${r.createdBy || r.sentFrom}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; text-align:right; font-size:13px;">${emailCurrency(total)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${sentDate}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; text-align:center;">${miniApprovalButtons(approveUrl, rejectUrl)}</td>
            </tr>
          `
        }).join('')

        const managerHtml = wrapEmailLayout(`
          ${emailHeader(`แจ้งเตือน: มี ${items.length} รายการ PO รอการอนุมัติ`, 'warning')}
          <div style="padding:24px 32px; color:${EMAIL_COLORS.BLACK}; font-size:14px; line-height:1.7;">
            <p style="margin:0 0 16px;">รายการ PO ต่อไปนี้ส่งมาแล้วมากกว่า 1 วัน ยังไม่ได้รับการอนุมัติ กรุณาพิจารณาดำเนินการ</p>
            <table style="width:100%; border-collapse:collapse; margin:0 0 16px; border:1px solid #E8E8E9; border-radius:8px; overflow:hidden;">
              <thead>
                <tr style="background:${EMAIL_COLORS.LIGHT_BG};">
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">ไฟล์</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">ผู้ส่ง</th>
                  <th style="padding:10px 14px; text-align:right; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">จำนวนเงิน</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">วันที่ส่ง</th>
                  <th style="padding:10px 14px; text-align:center; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                ${poListHtml}
              </tbody>
            </table>
            ${ctaButton('เข้าสู่ Dashboard', `${baseUrl}/dashboard`)}
          </div>
        `)

        await sendEmail({
          to: approverEmail,
          subject: `แจ้งเตือน: มี ${items.length} รายการ PO รอการอนุมัติ`,
          htmlBody: managerHtml,
        })
        emailsSent++
      } catch (error) {
        console.error(`Error sending reminder to approver ${approverEmail}:`, error)
      }
    }

    // Send reminder to each sender (employee)
    for (const [senderEmail, items] of Array.from(bySender)) {
      try {
        const poListHtml = items.map(({ record: r, currentLevel, maxLevel, approverEmail }) => {
          const total = Number(r.total) || 0
          const sentDate = new Date(r.sentAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
          })

          return `
            <tr>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${r.fileName}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${approverEmail}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; text-align:right; font-size:13px;">${emailCurrency(total)}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-size:13px;">${sentDate}</td>
              <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; text-align:center;">${pendingBadge(currentLevel, maxLevel)}</td>
            </tr>
          `
        }).join('')

        const employeeHtml = wrapEmailLayout(`
          ${emailHeader(`PO ของคุณ ${items.length} รายการ ยังรอการอนุมัติ`, 'cyan')}
          <div style="padding:24px 32px; color:${EMAIL_COLORS.BLACK}; font-size:14px; line-height:1.7;">
            <p style="margin:0 0 16px;">รายการ PO ต่อไปนี้ส่งไปแล้วมากกว่า 1 วัน ยังไม่ได้รับการอนุมัติ</p>
            <table style="width:100%; border-collapse:collapse; margin:0 0 16px; border:1px solid #E8E8E9; border-radius:8px; overflow:hidden;">
              <thead>
                <tr style="background:${EMAIL_COLORS.LIGHT_BG};">
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">ไฟล์</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">รอผู้อนุมัติ</th>
                  <th style="padding:10px 14px; text-align:right; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">จำนวนเงิน</th>
                  <th style="padding:10px 14px; text-align:left; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">วันที่ส่ง</th>
                  <th style="padding:10px 14px; text-align:center; border-bottom:2px solid ${EMAIL_COLORS.PRIMARY}; font-size:12px; color:${EMAIL_COLORS.GREY}; font-weight:700;">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${poListHtml}
              </tbody>
            </table>
          </div>
        `)

        await sendEmail({
          to: senderEmail,
          subject: `แจ้งเตือน: PO ของคุณ ${items.length} รายการ ยังรอการอนุมัติ`,
          htmlBody: employeeHtml,
        })
        emailsSent++
      } catch (error) {
        console.error(`Error sending reminder to employee ${senderEmail}:`, error)
      }
    }

    // Update last_reminder_sent for all reminded records
    for (const record of records) {
      try {
        await updateRecord(record.id, { lastReminderSent: now })
      } catch (error) {
        console.error(`Error updating last_reminder_sent for ${record.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${emailsSent} reminder emails for ${records.length} pending POs`,
      count: records.length,
      emailsSent,
    })
  } catch (error: any) {
    console.error('Cron reminder error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send reminders' },
      { status: 500 }
    )
  }
}

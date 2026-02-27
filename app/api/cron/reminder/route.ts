import { NextRequest, NextResponse } from 'next/server'
import { getPendingRecordsForReminder, updateRecord } from '@/lib/db'
import { sendEmail } from '@/lib/microsoft-graph'
import { generateApprovalToken, getApprovalUrl } from '@/lib/approval'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key') || request.headers.get('x-cron-secret')

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

    // Group records by recipient (Manager - sentTo) for consolidated email
    const byRecipient = new Map<string, typeof records>()
    // Group records by sender (Employee - sentFrom/createdBy) for consolidated email
    const bySender = new Map<string, typeof records>()

    for (const record of records) {
      // Group by recipient (manager)
      const existing = byRecipient.get(record.sentTo) || []
      existing.push(record)
      byRecipient.set(record.sentTo, existing)

      // Group by sender (employee)
      const senderKey = record.createdBy || record.sentFrom
      if (senderKey) {
        const senderExisting = bySender.get(senderKey) || []
        senderExisting.push(record)
        bySender.set(senderKey, senderExisting)
      }
    }

    let emailsSent = 0

    // Send reminder to each Manager (recipient)
    for (const [recipientEmail, recipientRecords] of byRecipient) {
      try {
        const poListHtml = recipientRecords.map(r => {
          const token = generateApprovalToken(r.id)
          const approveUrl = getApprovalUrl(token, 'approve')
          const rejectUrl = getApprovalUrl(token, 'reject')
          const total = Number(r.total) || 0
          const sentDate = new Date(r.sentAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
          })

          return `
            <tr>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.fileName}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.createdBy || r.sentFrom}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${sentDate}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">
                <a href="${approveUrl}" style="display:inline-block; padding:6px 16px; background:#22c55e; color:white; text-decoration:none; border-radius:4px; font-size:12px; margin-right:4px;">Approve</a>
                <a href="${rejectUrl}" style="display:inline-block; padding:6px 16px; background:#ef4444; color:white; text-decoration:none; border-radius:4px; font-size:12px;">Reject</a>
              </td>
            </tr>
          `
        }).join('')

        const managerHtml = `
          <div style="font-family:Arial, sans-serif; max-width:700px; margin:0 auto;">
            <div style="background:#f59e0b; color:white; padding:20px; text-align:center; border-radius:8px 8px 0 0;">
              <h1 style="margin:0; font-size:22px;">แจ้งเตือน: มี ${recipientRecords.length} รายการ PO รอการอนุมัติ</h1>
            </div>
            <div style="background:#f9fafb; padding:20px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
              <p style="margin:0 0 16px; color:#374151;">รายการ PO ต่อไปนี้ส่งมาแล้วมากกว่า 1 วัน ยังไม่ได้รับการอนุมัติ กรุณาพิจารณาดำเนินการ</p>
              <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">ไฟล์</th>
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">ผู้ส่ง</th>
                    <th style="padding:10px; text-align:right; border-bottom:2px solid #d1d5db;">จำนวนเงิน</th>
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">วันที่ส่ง</th>
                    <th style="padding:10px; text-align:center; border-bottom:2px solid #d1d5db;">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${poListHtml}
                </tbody>
              </table>
              <div style="text-align:center; margin-top:16px;">
                <a href="${baseUrl}/dashboard" style="display:inline-block; padding:10px 24px; background:#3b82f6; color:white; text-decoration:none; border-radius:6px; font-weight:bold;">เข้าสู่ Dashboard</a>
              </div>
              <p style="margin:16px 0 0; font-size:12px; color:#9ca3af; text-align:center;">อีเมลนี้ส่งอัตโนมัติจากระบบ PO Approval</p>
            </div>
          </div>
        `

        await sendEmail({
          to: recipientEmail,
          subject: `แจ้งเตือน: มี ${recipientRecords.length} รายการ PO รอการอนุมัติ`,
          htmlBody: managerHtml,
        })
        emailsSent++
      } catch (error) {
        console.error(`Error sending reminder to manager ${recipientEmail}:`, error)
      }
    }

    // Send reminder to each Employee (sender)
    for (const [senderEmail, senderRecords] of bySender) {
      try {
        const poListHtml = senderRecords.map(r => {
          const total = Number(r.total) || 0
          const sentDate = new Date(r.sentAt).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
          })

          return `
            <tr>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.fileName}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${r.sentTo}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:right;">$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb;">${sentDate}</td>
              <td style="padding:10px; border-bottom:1px solid #e5e7eb; text-align:center;">
                <span style="display:inline-block; padding:4px 12px; background:#fef3c7; color:#92400e; border-radius:12px; font-size:12px;">รอการอนุมัติ</span>
              </td>
            </tr>
          `
        }).join('')

        const employeeHtml = `
          <div style="font-family:Arial, sans-serif; max-width:700px; margin:0 auto;">
            <div style="background:#6366f1; color:white; padding:20px; text-align:center; border-radius:8px 8px 0 0;">
              <h1 style="margin:0; font-size:22px;">แจ้งเตือน: PO ของคุณ ${senderRecords.length} รายการ ยังรอการอนุมัติ</h1>
            </div>
            <div style="background:#f9fafb; padding:20px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
              <p style="margin:0 0 16px; color:#374151;">รายการ PO ต่อไปนี้ส่งไปแล้วมากกว่า 1 วัน ยังไม่ได้รับการอนุมัติ</p>
              <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">ไฟล์</th>
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">ส่งถึง</th>
                    <th style="padding:10px; text-align:right; border-bottom:2px solid #d1d5db;">จำนวนเงิน</th>
                    <th style="padding:10px; text-align:left; border-bottom:2px solid #d1d5db;">วันที่ส่ง</th>
                    <th style="padding:10px; text-align:center; border-bottom:2px solid #d1d5db;">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  ${poListHtml}
                </tbody>
              </table>
              <p style="margin:16px 0 0; font-size:12px; color:#9ca3af; text-align:center;">อีเมลนี้ส่งอัตโนมัติจากระบบ PO Approval</p>
            </div>
          </div>
        `

        await sendEmail({
          to: senderEmail,
          subject: `แจ้งเตือน: PO ของคุณ ${senderRecords.length} รายการ ยังรอการอนุมัติ`,
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

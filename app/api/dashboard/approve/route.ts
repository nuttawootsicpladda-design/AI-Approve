import { NextRequest, NextResponse } from 'next/server'
import { getRecordById, updateRecord } from '@/lib/db'
import { moveMultipleSharePointFiles, sendEmail } from '@/lib/microsoft-graph'

function getCallerRole(request: NextRequest): string | null {
  const userInfo = request.cookies.get('user-info')
  if (!userInfo) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(userInfo.value))
    return parsed.role || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { recordId, action, comment } = await request.json()

    if (!recordId || !action) {
      return NextResponse.json(
        { success: false, error: 'recordId and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const record = await getRecordById(recordId)
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    if (record.approvalStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This PO has already been ${record.approvalStatus}` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      await updateRecord(recordId, {
        approvalStatus: 'approved',
        approvedAt: now,
        approvalComment: comment || undefined,
      })

      // Move SharePoint files to approved folder
      if (record.sharePointFiles && record.sharePointFiles.length > 0 && record.approvedFolderPath) {
        try {
          await moveMultipleSharePointFiles(
            record.sharePointFiles.map(f => ({ driveId: f.driveId, fileId: f.fileId })),
            record.approvedFolderPath
          )
        } catch (error) {
          console.error('Error moving files on approval:', error)
        }
      }
    } else {
      await updateRecord(recordId, {
        approvalStatus: 'rejected',
        rejectedAt: now,
        approvalComment: comment || undefined,
      })
    }

    // Send notification email
    try {
      const statusText = action === 'approve' ? 'อนุมัติ (Approved)' : 'ไม่อนุมัติ (Rejected)'
      const statusColor = action === 'approve' ? '#22c55e' : '#ef4444'

      const notificationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">PO ${statusText}</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px;">คำขออนุมัติ PO ได้รับการตอบกลับแล้ว</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">ไฟล์:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${record.fileName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">ผู้ส่ง:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${record.sentFrom}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">ส่งถึง:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${record.sentTo}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">สถานะ:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: ${statusColor}; font-weight: bold;">${statusText}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">วันที่:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(now).toLocaleString('th-TH')}</td>
              </tr>
              ${comment ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">หมายเหตุ:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${comment}</td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>
      `

      const replyAllCc = [record.sentTo]
      if (record.sentCc) replyAllCc.push(record.sentCc)

      await sendEmail({
        to: record.sentFrom,
        cc: replyAllCc.join(', '),
        subject: `Re: PO ${statusText} - ${record.fileName}`,
        htmlBody: notificationHtml,
      })
    } catch (error) {
      console.error('Error sending notification email:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        action,
        recordId,
        message: action === 'approve' ? 'PO has been approved' : 'PO has been rejected',
      },
    })
  } catch (error: any) {
    console.error('Dashboard approval error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process approval' },
      { status: 500 }
    )
  }
}

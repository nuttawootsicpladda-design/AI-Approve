import { NextRequest, NextResponse } from 'next/server'
import { verifyApprovalToken } from '@/lib/approval'
import { moveMultipleSharePointFiles, sendEmail } from '@/lib/microsoft-graph'
import { PORecord } from '@/lib/types'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'po-records.json')

// Helper to read records
function readRecords(): PORecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading records:', error)
  }
  return []
}

// Helper to write records
function writeRecords(records: PORecord[]): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2))
}

// GET: Get approval status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token is required' },
      { status: 400 }
    )
  }

  const { valid, recordId, expired } = verifyApprovalToken(token)

  if (!valid) {
    return NextResponse.json(
      { success: false, error: expired ? 'Token has expired' : 'Invalid token' },
      { status: 400 }
    )
  }

  const records = readRecords()
  const record = records.find((r) => r.id === recordId)

  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Record not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      id: record.id,
      fileName: record.fileName,
      items: record.items,
      total: record.total,
      sentAt: record.sentAt,
      approvalStatus: record.approvalStatus || 'pending',
      approvedAt: record.approvedAt,
      rejectedAt: record.rejectedAt,
      approvalComment: record.approvalComment,
    },
  })
}

// POST: Process approval action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, action, comment } = body

    if (!token || !action) {
      return NextResponse.json(
        { success: false, error: 'Token and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const { valid, recordId, expired } = verifyApprovalToken(token)

    if (!valid) {
      return NextResponse.json(
        { success: false, error: expired ? 'Token has expired' : 'Invalid token' },
        { status: 400 }
      )
    }

    const records = readRecords()
    const recordIndex = records.findIndex((r) => r.id === recordId)

    if (recordIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    const record = records[recordIndex]

    // Check if already processed
    if (record.approvalStatus && record.approvalStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This request has already been ${record.approvalStatus}` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Update record
    if (action === 'approve') {
      record.approvalStatus = 'approved'
      record.approvedAt = now
      record.approvalComment = comment

      // Move files to approved folder if SharePoint files exist
      if (record.sharePointFiles && record.sharePointFiles.length > 0 && record.approvedFolderPath) {
        try {
          const moveResult = await moveMultipleSharePointFiles(
            record.sharePointFiles.map((f) => ({
              driveId: f.driveId,
              fileId: f.fileId,
            })),
            record.approvedFolderPath
          )

          if (!moveResult.success) {
            console.error('Some files failed to move:', moveResult.errors)
          }
        } catch (error) {
          console.error('Error moving files:', error)
          // Continue with approval even if file move fails
        }
      }
    } else {
      record.approvalStatus = 'rejected'
      record.rejectedAt = now
      record.approvalComment = comment
    }

    records[recordIndex] = record
    writeRecords(records)

    // Send notification email to the original sender
    try {
      const statusText = action === 'approve' ? 'อนุมัติ (Approved)' : 'ไม่อนุมัติ (Rejected)'
      const statusColor = action === 'approve' ? '#22c55e' : '#ef4444'

      const notificationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">PO ${statusText}</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px;">คำขออนุมัติ PO ของคุณได้รับการตอบกลับแล้ว</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">ไฟล์:</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${record.fileName}</td>
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
            ${action === 'approve' && record.sharePointFiles && record.approvedFolderPath ? `
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              ไฟล์ได้ถูกย้ายไปยัง: ${record.approvedFolderPath}
            </p>
            ` : ''}
          </div>
        </div>
      `

      await sendEmail({
        to: record.sentFrom,
        subject: `PO ${statusText} - ${record.fileName}`,
        htmlBody: notificationHtml,
      })
    } catch (error) {
      console.error('Error sending notification email:', error)
      // Continue even if notification fails
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
    console.error('Approval error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

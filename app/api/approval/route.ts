import { NextRequest, NextResponse } from 'next/server'
import { verifyApprovalToken } from '@/lib/approval'
import { getRecordById, getApprovalStepByToken, getApprovalStepsForPO } from '@/lib/db'
import { processApprovalAction } from '@/lib/approval-flow'

// GET: Get approval status + level info
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token is required' },
      { status: 400 }
    )
  }

  const { valid, recordId, level, expired } = verifyApprovalToken(token)

  if (!valid) {
    return NextResponse.json(
      { success: false, error: expired ? 'Token has expired' : 'Invalid token' },
      { status: 400 }
    )
  }

  const record = await getRecordById(recordId!)
  if (!record) {
    return NextResponse.json(
      { success: false, error: 'Record not found' },
      { status: 404 }
    )
  }

  // Get approval steps for timeline
  const steps = await getApprovalStepsForPO(recordId!)
  const currentStep = steps.find(s => s.approvalToken === token)

  return NextResponse.json({
    success: true,
    data: {
      id: record.id,
      fileName: record.fileName,
      items: record.items,
      total: record.total,
      sentAt: record.sentAt,
      sentFrom: record.sentFrom,
      createdBy: record.createdBy,
      approvalStatus: record.approvalStatus || 'pending',
      approvedAt: record.approvedAt,
      rejectedAt: record.rejectedAt,
      approvalComment: record.approvalComment,
      currentApprovalLevel: record.currentApprovalLevel || 1,
      maxApprovalLevel: record.maxApprovalLevel || 1,
      currentLevel: level,
      stepStatus: currentStep?.status || 'pending',
      steps: steps.map(s => ({
        level: s.level,
        approverEmail: s.approverEmail,
        status: s.status,
        comment: s.comment,
        actedAt: s.actedAt,
      })),
    },
  })
}

// POST: Process approval action (from email link)
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

    const { valid, recordId, level, expired } = verifyApprovalToken(token)

    if (!valid) {
      return NextResponse.json(
        { success: false, error: expired ? 'Token has expired' : 'Invalid token' },
        { status: 400 }
      )
    }

    // Find the approval step by token
    const step = await getApprovalStepByToken(token)

    if (step) {
      // Multi-level flow: use processApprovalAction
      if (step.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `This approval step has already been ${step.status}` },
          { status: 400 }
        )
      }

      const result = await processApprovalAction({
        poRecordId: step.poRecordId,
        stepId: step.id,
        action,
        comment,
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          action,
          recordId: step.poRecordId,
          level,
          isFinalized: result.isFinalized,
          nextLevel: result.nextLevel,
          nextLevelName: result.nextLevelName,
          message: action === 'approve'
            ? (result.isFinalized
                ? 'PO has been approved (final)'
                : `PO approved at Level ${level}, routed to ${result.nextLevelName}`)
            : 'PO has been rejected',
        },
      })
    } else {
      // Fallback: legacy single-level (no approval_steps record)
      const record = await getRecordById(recordId!)
      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Record not found' },
          { status: 404 }
        )
      }

      if (record.approvalStatus !== 'pending') {
        return NextResponse.json(
          { success: false, error: `This request has already been ${record.approvalStatus}` },
          { status: 400 }
        )
      }

      const { updateRecord } = await import('@/lib/db')
      const { moveMultipleSharePointFiles, sendEmail } = await import('@/lib/microsoft-graph')
      const now = new Date().toISOString()

      if (action === 'approve') {
        await updateRecord(recordId!, {
          approvalStatus: 'approved',
          approvedAt: now,
          approvalComment: comment,
        })

        if (record.sharePointFiles && record.sharePointFiles.length > 0 && record.approvedFolderPath) {
          try {
            await moveMultipleSharePointFiles(
              record.sharePointFiles.map(f => ({ driveId: f.driveId, fileId: f.fileId })),
              record.approvedFolderPath
            )
          } catch (error) {
            console.error('Error moving files:', error)
          }
        }
      } else {
        await updateRecord(recordId!, {
          approvalStatus: 'rejected',
          rejectedAt: now,
          approvalComment: comment,
        })
      }

      // Send notification email
      try {
        const statusText = action === 'approve' ? 'อนุมัติ (Approved)' : 'ไม่อนุมัติ (Rejected)'
        await sendEmail({
          to: record.createdBy || record.sentFrom,
          subject: `Re: PO ${statusText} - ${record.fileName}`,
          htmlBody: `
            <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
              <div style="background:${action === 'approve' ? '#22c55e' : '#ef4444'}; color:white; padding:16px; text-align:center; border-radius:8px 8px 0 0;">
                <h2 style="margin:0;">PO ${statusText}</h2>
              </div>
              <div style="padding:20px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
                <p>PO <strong>${record.fileName}</strong> ได้รับการ${statusText}แล้ว</p>
                ${comment ? `<p>หมายเหตุ: ${comment}</p>` : ''}
              </div>
            </div>
          `,
        })
      } catch (error) {
        console.error('Error sending notification email:', error)
      }

      return NextResponse.json({
        success: true,
        data: {
          action,
          recordId,
          isFinalized: true,
          message: action === 'approve' ? 'PO has been approved' : 'PO has been rejected',
        },
      })
    }
  } catch (error: unknown) {
    console.error('Approval error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

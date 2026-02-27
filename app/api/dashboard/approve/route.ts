import { NextRequest, NextResponse } from 'next/server'
import { getRecordById, getApprovalStepsForPO } from '@/lib/db'
import { processApprovalAction } from '@/lib/approval-flow'

function getCallerInfo(request: NextRequest): { role: string; email: string } | null {
  const userInfo = request.cookies.get('user-info')
  if (!userInfo) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(userInfo.value))
    return { role: parsed.role || '', email: parsed.email || '' }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const caller = getCallerInfo(request)
  if (!caller || (caller.role !== 'manager' && caller.role !== 'admin')) {
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

    // Find the pending approval step for this PO
    const steps = await getApprovalStepsForPO(recordId)
    const pendingStep = steps.find(s => s.status === 'pending')

    if (pendingStep) {
      // Multi-level flow: verify the caller is the assigned approver (or admin)
      if (caller.role !== 'admin' && caller.email.toLowerCase() !== pendingStep.approverEmail.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: `คุณไม่ใช่ผู้อนุมัติสำหรับ Level ${pendingStep.level} (ผู้อนุมัติ: ${pendingStep.approverEmail})` },
          { status: 403 }
        )
      }

      const result = await processApprovalAction({
        poRecordId: recordId,
        stepId: pendingStep.id,
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
          recordId,
          level: pendingStep.level,
          isFinalized: result.isFinalized,
          nextLevel: result.nextLevel,
          nextLevelName: result.nextLevelName,
          message: action === 'approve'
            ? (result.isFinalized
                ? 'PO has been approved (final)'
                : `PO approved at Level ${pendingStep.level}, routed to ${result.nextLevelName}`)
            : 'PO has been rejected',
        },
      })
    } else {
      // Fallback: legacy single-level (no approval_steps)
      const { updateRecord } = await import('@/lib/db')
      const { moveMultipleSharePointFiles, sendEmail } = await import('@/lib/microsoft-graph')
      const now = new Date().toISOString()

      if (action === 'approve') {
        await updateRecord(recordId, {
          approvalStatus: 'approved',
          approvedAt: now,
          approvalComment: comment || undefined,
        })

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
  } catch (error: any) {
    console.error('Dashboard approval error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process approval' },
      { status: 500 }
    )
  }
}

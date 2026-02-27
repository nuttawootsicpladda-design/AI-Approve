import { NextRequest, NextResponse } from 'next/server'
import { getPendingRecords, getPendingStepsForApprover } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  const caller = getCallerInfo(request)
  if (!caller || (caller.role !== 'manager' && caller.role !== 'admin')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Try multi-level: get pending steps assigned to this approver
    const pendingSteps = await getPendingStepsForApprover(caller.email)

    if (pendingSteps.length > 0) {
      return NextResponse.json({
        success: true,
        data: pendingSteps.map(s => ({
          id: s.poRecordId,
          stepId: s.id,
          level: s.level,
          approverEmail: s.approverEmail,
          fileName: s.poRecord?.fileName,
          sentTo: s.poRecord?.sentTo,
          sentFrom: s.poRecord?.sentFrom,
          total: s.poRecord?.total,
          sentAt: s.poRecord?.sentAt,
          createdBy: s.poRecord?.createdBy,
          items: s.poRecord?.items,
          currentApprovalLevel: s.poRecord?.currentApprovalLevel || 1,
          maxApprovalLevel: s.poRecord?.maxApprovalLevel || 1,
        })),
      })
    }

    // Fallback: if no steps found (no levels configured), use legacy getPendingRecords
    // Admin sees all pending, manager sees all pending (legacy behavior)
    const records = await getPendingRecords()
    return NextResponse.json({
      success: true,
      data: records.map(r => ({
        id: r.id,
        fileName: r.fileName,
        sentTo: r.sentTo,
        sentFrom: r.sentFrom,
        total: r.total,
        sentAt: r.sentAt,
        createdBy: r.createdBy,
        items: r.items,
        currentApprovalLevel: r.currentApprovalLevel || 1,
        maxApprovalLevel: r.maxApprovalLevel || 1,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pending records' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getPendingRecords } from '@/lib/db'

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

export async function GET(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
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
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pending records' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  getApprovalLevelConfigs,
  upsertApprovalLevelConfig,
  deleteApprovalLevelConfig,
} from '@/lib/db'

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

// GET: List all approval level configs
export async function GET(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const configs = await getApprovalLevelConfigs()
    return NextResponse.json({ success: true, data: configs })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch approval levels' },
      { status: 500 }
    )
  }
}

// POST: Create or update an approval level config
export async function POST(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { level, levelName, maxAmount, approverEmail, isActive } = body

    if (!level || !levelName || !approverEmail) {
      return NextResponse.json(
        { success: false, error: 'level, levelName, and approverEmail are required' },
        { status: 400 }
      )
    }

    if (level < 1 || level > 3) {
      return NextResponse.json(
        { success: false, error: 'Level must be between 1 and 3' },
        { status: 400 }
      )
    }

    const config = await upsertApprovalLevelConfig({
      level,
      levelName,
      maxAmount: maxAmount !== undefined && maxAmount !== null && maxAmount !== '' ? Number(maxAmount) : null,
      approverEmail,
      isActive: isActive !== false,
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save approval level' },
      { status: 500 }
    )
  }
}

// DELETE: Remove an approval level config
export async function DELETE(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    await deleteApprovalLevelConfig(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete approval level' },
      { status: 500 }
    )
  }
}

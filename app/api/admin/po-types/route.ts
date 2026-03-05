import { NextRequest, NextResponse } from 'next/server'
import { getPOTypes, upsertPOType, deletePOType } from '@/lib/db'

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
  if (role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const types = await getPOTypes()
    return NextResponse.json({ success: true, data: types })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch PO types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const role = getCallerRole(request)
  if (role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, name, description, isActive } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const result = await upsertPOType({
      id,
      name: name.trim(),
      description,
      isActive: isActive !== false,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save PO type' },
      { status: 500 }
    )
  }
}

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

    await deletePOType(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete PO type' },
      { status: 500 }
    )
  }
}

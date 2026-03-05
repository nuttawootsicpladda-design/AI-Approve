import { NextResponse } from 'next/server'
import { getActivePOTypes } from '@/lib/db'

export async function GET() {
  try {
    const types = await getActivePOTypes()
    return NextResponse.json({ success: true, data: types })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch PO types' },
      { status: 500 }
    )
  }
}

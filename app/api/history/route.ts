import { NextRequest, NextResponse } from 'next/server'
import { getAllRecords, getRecordById, deleteRecord } from '@/lib/db'

// GET - Get all records or specific record by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const record = await getRecordById(id)
      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Record not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: record })
    }

    const records = await getAllRecords()
    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    console.error('History GET API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get records' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteRecord(id)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('History DELETE API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete record' },
      { status: 500 }
    )
  }
}

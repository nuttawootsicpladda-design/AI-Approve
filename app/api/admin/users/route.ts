import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, updateUserRole, deleteUser } from '@/lib/db'
import { UserRole } from '@/lib/types'

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

// GET - List all users
export async function GET(request: NextRequest) {
  if (getCallerRole(request) !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const users = await getAllUsers()
    return NextResponse.json({ success: true, data: users })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  if (getCallerRole(request) !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { email, name, role } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const validRoles: UserRole[] = ['employee', 'manager', 'admin']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    const user = await createUser(email, name || '', role || 'employee')
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user (email may already exist)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

// PUT - Update user role
export async function PUT(request: NextRequest) {
  if (getCallerRole(request) !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, role } = await request.json()

    if (!id || !role) {
      return NextResponse.json(
        { success: false, error: 'ID and role are required' },
        { status: 400 }
      )
    }

    const validRoles: UserRole[] = ['employee', 'manager', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    const updated = await updateUserRole(id, role)
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a user
export async function DELETE(request: NextRequest) {
  if (getCallerRole(request) !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteUser(id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}

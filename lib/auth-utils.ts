import { UserRole } from './types'
import { supabase } from './supabase'

export interface UserInfo {
  email: string
  name: string
  role: UserRole
}

// Get user role from Supabase by email
export async function getUserRole(email: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) {
    return 'employee'
  }

  return data.role as UserRole
}

// Find or create user in Supabase, return role
export async function findOrCreateUser(email: string, name: string): Promise<UserRole> {
  const lowerEmail = email.toLowerCase()
  console.log('[findOrCreateUser] Looking up email:', lowerEmail)

  // Try to find existing user
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select('role')
    .eq('email', lowerEmail)
    .single()

  console.log('[findOrCreateUser] Find result:', { existing, findError })

  if (existing) {
    console.log('[findOrCreateUser] Found user with role:', existing.role)
    // Update name if changed
    await supabase
      .from('users')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('email', lowerEmail)
    return existing.role as UserRole
  }

  // Create new user with default role
  console.log('[findOrCreateUser] User not found, creating new user...')
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ email: lowerEmail, name, role: 'employee' })
    .select('role')
    .single()

  if (error) {
    console.error('[findOrCreateUser] Error creating user:', error)
    return 'employee'
  }

  console.log('[findOrCreateUser] Created new user with role:', newUser?.role)
  return (newUser?.role as UserRole) || 'employee'
}

// Parse user-info cookie (client-side)
export function parseUserInfoCookie(): UserInfo | null {
  if (typeof document === 'undefined') return null

  try {
    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('user-info='))
    if (!cookie) return null

    const value = decodeURIComponent(cookie.split('=')[1])
    return JSON.parse(value) as UserInfo
  } catch {
    return null
  }
}

// Role permission helpers
export function canViewDashboard(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canViewAllHistory(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canApprove(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

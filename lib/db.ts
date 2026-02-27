import { supabase } from './supabase'
import { PORecord, User, UserRole } from './types'

// Helper: map Supabase row to PORecord
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(record: any): PORecord {
  return {
    id: record.id,
    fileName: record.file_name,
    items: record.items,
    total: record.total,
    sentTo: record.sent_to,
    sentCc: record.sent_cc,
    sentFrom: record.sent_from,
    sentAt: record.sent_at,
    status: record.status,
    approvalStatus: record.approval_status,
    approvalToken: record.approval_token,
    approvedAt: record.approved_at,
    rejectedAt: record.rejected_at,
    approvalComment: record.approval_comment,
    sharePointFiles: record.sharepoint_files,
    approvedFolderPath: record.approved_folder_path,
    createdBy: record.created_by,
    lastReminderSent: record.last_reminder_sent,
  }
}

// Read all records (optionally filter by user email)
export async function getAllRecords(userEmail?: string): Promise<PORecord[]> {
  try {
    let query = supabase
      .from('po_records')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false })

    if (userEmail) {
      query = query.eq('created_by', userEmail.toLowerCase())
    }

    const { data, error, count } = await query

    console.log('getAllRecords: fetched', data?.length, 'records, total count:', count)

    if (error) {
      console.error('Error reading records from Supabase:', error)
      return []
    }

    return (data || []).map(mapRecord)
  } catch (error) {
    console.error('Error reading records from Supabase:', error)
    return []
  }
}

// Save a new record
export async function saveRecord(record: Omit<PORecord, 'id'>): Promise<PORecord> {
  const { data, error } = await supabase
    .from('po_records')
    .insert({
      file_name: record.fileName,
      items: record.items,
      total: record.total,
      sent_to: record.sentTo,
      sent_cc: record.sentCc,
      sent_from: record.sentFrom,
      sent_at: record.sentAt,
      status: record.status,
      approval_status: record.approvalStatus || 'pending',
      approval_token: record.approvalToken,
      approved_at: record.approvedAt,
      rejected_at: record.rejectedAt,
      approval_comment: record.approvalComment,
      sharepoint_files: record.sharePointFiles,
      approved_folder_path: record.approvedFolderPath,
      created_by: record.createdBy?.toLowerCase(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving record to Supabase:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to save record: ${error.message}`)
  }

  return mapRecord(data)
}

// Get record by ID
export async function getRecordById(id: string): Promise<PORecord | null> {
  const { data, error } = await supabase
    .from('po_records')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return mapRecord(data)
}

// Delete record
export async function deleteRecord(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('po_records')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting record:', error)
    return false
  }

  return true
}

// Update record
export async function updateRecord(id: string, updates: Partial<PORecord>): Promise<PORecord | null> {
  const supabaseUpdates: Record<string, unknown> = {}

  if (updates.fileName !== undefined) supabaseUpdates.file_name = updates.fileName
  if (updates.items !== undefined) supabaseUpdates.items = updates.items
  if (updates.total !== undefined) supabaseUpdates.total = updates.total
  if (updates.sentTo !== undefined) supabaseUpdates.sent_to = updates.sentTo
  if (updates.sentCc !== undefined) supabaseUpdates.sent_cc = updates.sentCc
  if (updates.sentFrom !== undefined) supabaseUpdates.sent_from = updates.sentFrom
  if (updates.sentAt !== undefined) supabaseUpdates.sent_at = updates.sentAt
  if (updates.status !== undefined) supabaseUpdates.status = updates.status
  if (updates.approvalStatus !== undefined) supabaseUpdates.approval_status = updates.approvalStatus
  if (updates.approvalToken !== undefined) supabaseUpdates.approval_token = updates.approvalToken
  if (updates.approvedAt !== undefined) supabaseUpdates.approved_at = updates.approvedAt
  if (updates.rejectedAt !== undefined) supabaseUpdates.rejected_at = updates.rejectedAt
  if (updates.approvalComment !== undefined) supabaseUpdates.approval_comment = updates.approvalComment
  if (updates.sharePointFiles !== undefined) supabaseUpdates.sharepoint_files = updates.sharePointFiles
  if (updates.approvedFolderPath !== undefined) supabaseUpdates.approved_folder_path = updates.approvedFolderPath
  if (updates.createdBy !== undefined) supabaseUpdates.created_by = updates.createdBy
  if (updates.lastReminderSent !== undefined) supabaseUpdates.last_reminder_sent = updates.lastReminderSent

  const { data, error } = await supabase
    .from('po_records')
    .update(supabaseUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating record:', error)
    return null
  }

  return mapRecord(data)
}

// Get pending records (for dashboard approval)
export async function getPendingRecords(): Promise<PORecord[]> {
  try {
    const { data, error } = await supabase
      .from('po_records')
      .select('*')
      .eq('approval_status', 'pending')
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('Error fetching pending records:', error)
      return []
    }

    return (data || []).map(mapRecord)
  } catch (error) {
    console.error('Error fetching pending records:', error)
    return []
  }
}

// Get pending records for reminder (pending > 24h, not reminded today)
export async function getPendingRecordsForReminder(): Promise<PORecord[]> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()

    const { data, error } = await supabase
      .from('po_records')
      .select('*')
      .eq('approval_status', 'pending')
      .lt('sent_at', oneDayAgo)
      .or(`last_reminder_sent.is.null,last_reminder_sent.lt.${todayStartIso}`)
      .order('sent_at', { ascending: true })

    if (error) {
      console.error('Error fetching reminder records:', error)
      return []
    }

    return (data || []).map(mapRecord)
  } catch (error) {
    console.error('Error fetching reminder records:', error)
    return []
  }
}

// =====================
// User CRUD operations
// =====================

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return (data || []).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name || '',
    role: u.role as UserRole,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }))
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    email: data.email,
    name: data.name || '',
    role: data.role as UserRole,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function createUser(email: string, name: string, role: UserRole = 'employee'): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase(), name, role })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name || '',
    role: data.role as UserRole,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function updateUserRole(id: string, role: UserRole): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating user role:', error)
    return false
  }

  return true
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    return false
  }

  return true
}

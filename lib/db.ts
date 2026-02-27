import { supabase } from './supabase'
import { PORecord, User, UserRole, ApprovalLevelConfig, ApprovalStep, ApprovalStatus } from './types'

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
    currentApprovalLevel: record.current_approval_level,
    maxApprovalLevel: record.max_approval_level,
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
      current_approval_level: record.currentApprovalLevel || 1,
      max_approval_level: record.maxApprovalLevel || 1,
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
  if (updates.currentApprovalLevel !== undefined) supabaseUpdates.current_approval_level = updates.currentApprovalLevel
  if (updates.maxApprovalLevel !== undefined) supabaseUpdates.max_approval_level = updates.maxApprovalLevel

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

// ===============================
// Approval Level Config (Admin)
// ===============================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApprovalLevel(row: any): ApprovalLevelConfig {
  return {
    id: row.id,
    level: row.level,
    levelName: row.level_name,
    maxAmount: row.max_amount !== null ? Number(row.max_amount) : null,
    approverEmail: row.approver_email,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getApprovalLevelConfigs(): Promise<ApprovalLevelConfig[]> {
  const { data, error } = await supabase
    .from('approval_levels')
    .select('*')
    .order('level', { ascending: true })

  if (error) {
    console.error('Error fetching approval levels:', error)
    return []
  }
  return (data || []).map(mapApprovalLevel)
}

export async function getActiveApprovalLevels(): Promise<ApprovalLevelConfig[]> {
  const { data, error } = await supabase
    .from('approval_levels')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true })

  if (error) {
    console.error('Error fetching active approval levels:', error)
    return []
  }
  return (data || []).map(mapApprovalLevel)
}

export async function upsertApprovalLevelConfig(config: {
  level: number
  levelName: string
  maxAmount: number | null
  approverEmail: string
  isActive: boolean
}): Promise<ApprovalLevelConfig | null> {
  const { data, error } = await supabase
    .from('approval_levels')
    .upsert({
      level: config.level,
      level_name: config.levelName,
      max_amount: config.maxAmount,
      approver_email: config.approverEmail.toLowerCase(),
      is_active: config.isActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'level' })
    .select()
    .single()

  if (error) {
    console.error('Error upserting approval level:', error)
    return null
  }
  return mapApprovalLevel(data)
}

export async function deleteApprovalLevelConfig(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('approval_levels')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting approval level:', error)
    return false
  }
  return true
}

// ===============================
// Approval Steps (Per-PO)
// ===============================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApprovalStep(row: any): ApprovalStep {
  return {
    id: row.id,
    poRecordId: row.po_record_id,
    level: row.level,
    approverEmail: row.approver_email,
    status: row.status as ApprovalStatus,
    approvalToken: row.approval_token,
    comment: row.comment,
    actedAt: row.acted_at,
    createdAt: row.created_at,
  }
}

export async function createApprovalStep(step: {
  poRecordId: string
  level: number
  approverEmail: string
  approvalToken: string
}): Promise<ApprovalStep | null> {
  const { data, error } = await supabase
    .from('approval_steps')
    .insert({
      po_record_id: step.poRecordId,
      level: step.level,
      approver_email: step.approverEmail.toLowerCase(),
      approval_token: step.approvalToken,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating approval step:', error)
    return null
  }
  return mapApprovalStep(data)
}

export async function getApprovalStepsForPO(poRecordId: string): Promise<ApprovalStep[]> {
  const { data, error } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('po_record_id', poRecordId)
    .order('level', { ascending: true })

  if (error) {
    console.error('Error fetching approval steps:', error)
    return []
  }
  return (data || []).map(mapApprovalStep)
}

export async function getApprovalStepByToken(token: string): Promise<ApprovalStep | null> {
  const { data, error } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('approval_token', token)
    .single()

  if (error || !data) return null
  return mapApprovalStep(data)
}

export async function updateApprovalStep(id: string, updates: {
  status: ApprovalStatus
  comment?: string
  actedAt: string
}): Promise<ApprovalStep | null> {
  const { data, error } = await supabase
    .from('approval_steps')
    .update({
      status: updates.status,
      comment: updates.comment || null,
      acted_at: updates.actedAt,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating approval step:', error)
    return null
  }
  return mapApprovalStep(data)
}

export async function getPendingStepsForApprover(
  approverEmail: string
): Promise<(ApprovalStep & { poRecord: PORecord })[]> {
  const { data, error } = await supabase
    .from('approval_steps')
    .select('*, po_records(*)')
    .eq('approver_email', approverEmail.toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending steps for approver:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    ...mapApprovalStep(row),
    poRecord: mapRecord(row.po_records),
  }))
}

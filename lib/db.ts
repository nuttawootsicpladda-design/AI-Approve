import { supabase } from './supabase'
import { PORecord } from './types'

// Read all records
export async function getAllRecords(): Promise<PORecord[]> {
  try {
    const { data, error } = await supabase
      .from('po_records')
      .select('*')
      .order('sent_at', { ascending: false })

    if (error) {
      console.error('Error reading records from Supabase:', error)
      return []
    }

    // Convert snake_case to camelCase
    return (data || []).map(record => ({
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
    }))
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
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving record to Supabase:', error)
    throw new Error(`Failed to save record: ${error.message}`)
  }

  return {
    id: data.id,
    fileName: data.file_name,
    items: data.items,
    total: data.total,
    sentTo: data.sent_to,
    sentCc: data.sent_cc,
    sentFrom: data.sent_from,
    sentAt: data.sent_at,
    status: data.status,
    approvalStatus: data.approval_status,
    approvalToken: data.approval_token,
    approvedAt: data.approved_at,
    rejectedAt: data.rejected_at,
    approvalComment: data.approval_comment,
    sharePointFiles: data.sharepoint_files,
    approvedFolderPath: data.approved_folder_path,
  }
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

  return {
    id: data.id,
    fileName: data.file_name,
    items: data.items,
    total: data.total,
    sentTo: data.sent_to,
    sentCc: data.sent_cc,
    sentFrom: data.sent_from,
    sentAt: data.sent_at,
    status: data.status,
    approvalStatus: data.approval_status,
    approvalToken: data.approval_token,
    approvedAt: data.approved_at,
    rejectedAt: data.rejected_at,
    approvalComment: data.approval_comment,
    sharePointFiles: data.sharepoint_files,
    approvedFolderPath: data.approved_folder_path,
  }
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
  // Convert camelCase to snake_case for Supabase
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

  return {
    id: data.id,
    fileName: data.file_name,
    items: data.items,
    total: data.total,
    sentTo: data.sent_to,
    sentCc: data.sent_cc,
    sentFrom: data.sent_from,
    sentAt: data.sent_at,
    status: data.status,
    approvalStatus: data.approval_status,
    approvalToken: data.approval_token,
    approvedAt: data.approved_at,
    rejectedAt: data.rejected_at,
    approvalComment: data.approval_comment,
    sharePointFiles: data.sharepoint_files,
    approvedFolderPath: data.approved_folder_path,
  }
}

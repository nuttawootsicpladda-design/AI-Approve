import { kv } from '@vercel/kv'
import { PORecord } from './types'

const RECORDS_KEY = 'po-records'

// Read all records
export async function getAllRecords(): Promise<PORecord[]> {
  try {
    const records = await kv.get<PORecord[]>(RECORDS_KEY)
    return records || []
  } catch (error) {
    console.error('Error reading records from KV:', error)
    return []
  }
}

// Save a new record
export async function saveRecord(record: Omit<PORecord, 'id'>): Promise<PORecord> {
  const records = await getAllRecords()

  const newRecord: PORecord = {
    ...record,
    id: Date.now().toString(),
  }

  records.unshift(newRecord) // Add to beginning
  await kv.set(RECORDS_KEY, records)

  return newRecord
}

// Get record by ID
export async function getRecordById(id: string): Promise<PORecord | null> {
  const records = await getAllRecords()
  return records.find(r => r.id === id) || null
}

// Delete record
export async function deleteRecord(id: string): Promise<boolean> {
  const records = await getAllRecords()
  const filtered = records.filter(r => r.id !== id)

  if (filtered.length === records.length) {
    return false // Not found
  }

  await kv.set(RECORDS_KEY, filtered)
  return true
}

// Update record
export async function updateRecord(id: string, updates: Partial<PORecord>): Promise<PORecord | null> {
  const records = await getAllRecords()
  const index = records.findIndex(r => r.id === id)

  if (index === -1) {
    return null
  }

  records[index] = { ...records[index], ...updates }
  await kv.set(RECORDS_KEY, records)

  return records[index]
}

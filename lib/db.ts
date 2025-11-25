import { PORecord } from './types'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'po-records.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read all records
export async function getAllRecords(): Promise<PORecord[]> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DB_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save a new record
export async function saveRecord(record: Omit<PORecord, 'id'>): Promise<PORecord> {
  await ensureDataDir()
  const records = await getAllRecords()
  
  const newRecord: PORecord = {
    ...record,
    id: Date.now().toString(),
  }
  
  records.unshift(newRecord) // Add to beginning
  await fs.writeFile(DB_FILE, JSON.stringify(records, null, 2))
  
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
  
  await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2))
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
  await fs.writeFile(DB_FILE, JSON.stringify(records, null, 2))
  
  return records[index]
}

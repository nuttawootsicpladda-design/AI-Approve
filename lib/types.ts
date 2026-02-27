export interface POItem {
  no?: number
  name: string
  quantity: number | string
  cost: number | string
  poNo: string
  usd: number | string
}

export interface POData {
  items: POItem[]
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type UserRole = 'employee' | 'manager' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface SharePointFileInfo {
  driveId: string
  fileId: string
  fileName: string
  webUrl?: string
}

export interface PORecord {
  id: string
  fileName: string
  items: POItem[]
  total: number
  sentTo: string
  sentCc?: string // CC recipients
  sentFrom: string // Email ผู้ส่ง
  sentAt: string
  status: 'sent' | 'draft' | 'failed'
  approvalStatus?: ApprovalStatus
  approvalToken?: string
  approvedAt?: string
  rejectedAt?: string
  approvalComment?: string
  // SharePoint file info for moving files
  sharePointFiles?: SharePointFileInfo[]
  approvedFolderPath?: string // Path ที่จะย้ายไฟล์ไปเมื่อ approve
  createdBy?: string // Email ของคนที่สร้าง
  lastReminderSent?: string // วันที่ส่ง reminder ล่าสุด
}

export interface ExtractResponse {
  success: boolean
  data?: POData
  error?: string
}

export interface EmailRequest {
  to: string
  cc?: string
  subject: string
  htmlBody: string
  attachments?: Array<{
    name: string
    content: string // base64
  }>
}

export type Language = 'en' | 'th'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Translations {
  en: Record<string, any>
  th: Record<string, any>
}

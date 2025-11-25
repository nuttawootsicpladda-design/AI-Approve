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
}

export interface ExtractResponse {
  success: boolean
  data?: POData
  error?: string
}

export interface EmailRequest {
  to: string
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

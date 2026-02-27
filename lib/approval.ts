import crypto from 'crypto'

const APPROVAL_SECRET = process.env.APPROVAL_SECRET || 'po-approval-secret-key-change-in-production'

// Generate a secure approval token
export function generateApprovalToken(recordId: string): string {
  const timestamp = Date.now().toString()
  const data = `${recordId}:${timestamp}`
  const hash = crypto.createHmac('sha256', APPROVAL_SECRET).update(data).digest('hex')
  // Token format: recordId:timestamp:hash (base64 encoded)
  const token = Buffer.from(`${data}:${hash}`).toString('base64url')
  return token
}

// Verify and decode approval token
export function verifyApprovalToken(token: string): { valid: boolean; recordId?: string; expired?: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')

    if (parts.length !== 3) {
      return { valid: false }
    }

    const [recordId, timestamp, hash] = parts

    // Verify hash
    const data = `${recordId}:${timestamp}`
    const expectedHash = crypto.createHmac('sha256', APPROVAL_SECRET).update(data).digest('hex')

    if (hash !== expectedHash) {
      return { valid: false }
    }

    // Check if token is expired (7 days)
    const tokenTime = parseInt(timestamp, 10)
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    if (now - tokenTime > sevenDays) {
      return { valid: false, recordId, expired: true }
    }

    return { valid: true, recordId }
  } catch {
    return { valid: false }
  }
}

// Generate approval URL
export function getApprovalUrl(token: string, action: 'approve' | 'reject'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/approve?token=${token}&action=${action}`
}

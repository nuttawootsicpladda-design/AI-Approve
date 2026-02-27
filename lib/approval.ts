import crypto from 'crypto'

const APPROVAL_SECRET = process.env.APPROVAL_SECRET || 'po-approval-secret-key-change-in-production'

// Generate a secure approval token (with level support)
export function generateApprovalToken(recordId: string, level: number = 1): string {
  const timestamp = Date.now().toString()
  const data = `${recordId}:${level}:${timestamp}`
  const hash = crypto.createHmac('sha256', APPROVAL_SECRET).update(data).digest('hex')
  // Token format: recordId:level:timestamp:hash (base64url encoded)
  const token = Buffer.from(`${data}:${hash}`).toString('base64url')
  return token
}

// Verify and decode approval token
export function verifyApprovalToken(token: string): {
  valid: boolean
  recordId?: string
  level?: number
  expired?: boolean
} {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')

    // New format: recordId:level:timestamp:hash (4 parts)
    if (parts.length === 4) {
      const [recordId, levelStr, timestamp, hash] = parts
      const level = parseInt(levelStr, 10)

      const data = `${recordId}:${levelStr}:${timestamp}`
      const expectedHash = crypto.createHmac('sha256', APPROVAL_SECRET).update(data).digest('hex')

      if (hash !== expectedHash) {
        return { valid: false }
      }

      const tokenTime = parseInt(timestamp, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - tokenTime > sevenDays) {
        return { valid: false, recordId, level, expired: true }
      }

      return { valid: true, recordId, level }
    }

    // Legacy format: recordId:timestamp:hash (3 parts) — backward compat
    if (parts.length === 3) {
      const [recordId, timestamp, hash] = parts

      const data = `${recordId}:${timestamp}`
      const expectedHash = crypto.createHmac('sha256', APPROVAL_SECRET).update(data).digest('hex')

      if (hash !== expectedHash) {
        return { valid: false }
      }

      const tokenTime = parseInt(timestamp, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - tokenTime > sevenDays) {
        return { valid: false, recordId, level: 1, expired: true }
      }

      return { valid: true, recordId, level: 1 }
    }

    return { valid: false }
  } catch {
    return { valid: false }
  }
}

// Generate approval URL
export function getApprovalUrl(token: string, action: 'approve' | 'reject'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/approve?token=${token}&action=${action}`
}

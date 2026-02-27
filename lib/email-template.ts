/**
 * ICP Ladda - Email Template with Corporate Identity
 *
 * Brand Colors:
 * - Primary Blue: #004F9F (Pantone 286 C)
 * - Primary Dark: #003F7F
 * - Secondary Cyan: #33BDC1
 * - Success Green: #1DAF55
 * - Danger Red: #E3562B
 * - Warning Yellow: #F5C518
 * - Grey: #707A8F
 * - Black: #14181F
 */

const LOGO_URL = 'https://i.ibb.co/4wdW4yvd/ICP-ladda-logo-01-Copy.png'
const PRIMARY = '#004F9F'
const PRIMARY_DARK = '#003F7F'
const CYAN = '#33BDC1'
const SUCCESS = '#1DAF55'
const DANGER = '#E3562B'
const WARNING = '#F5C518'
const GREY = '#707A8F'
const BLACK = '#14181F'
const LIGHT_BG = '#F0F4F8'

/**
 * Wrap content in the ICP branded email layout
 */
export function wrapEmailLayout(content: string): string {
  return `
    <div style="background-color:${LIGHT_BG}; padding:32px 16px; font-family:'Public Sans',Arial,Helvetica,sans-serif;">
      <div style="max-width:640px; margin:0 auto;">
        <!-- Header with Logo -->
        <div style="text-align:center; margin-bottom:24px;">
          <img src="${LOGO_URL}" alt="ICP Ladda Co., Ltd" style="height:48px; width:auto;" />
        </div>

        <!-- Main Card -->
        <div style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,79,159,0.08);">
          ${content}
        </div>

        <!-- Footer -->
        <div style="text-align:center; margin-top:24px; padding:0 16px;">
          <p style="margin:0 0 4px; font-size:12px; color:${GREY};">
            ICP Ladda Co., Ltd — PO Approval System
          </p>
          <p style="margin:0; font-size:11px; color:#ABB1BA;">
            อีเมลนี้ส่งอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
          </p>
        </div>
      </div>
    </div>
  `
}

/**
 * Colored header banner
 */
export function emailHeader(title: string, color: 'primary' | 'success' | 'danger' | 'warning' | 'cyan' = 'primary'): string {
  const colorMap = {
    primary: PRIMARY,
    success: SUCCESS,
    danger: DANGER,
    warning: WARNING,
    cyan: CYAN,
  }
  return `
    <div style="background:${colorMap[color]}; padding:24px 32px; text-align:center;">
      <h1 style="margin:0; color:white; font-size:20px; font-weight:700; letter-spacing:0.3px;">${title}</h1>
    </div>
  `
}

/**
 * Content body wrapper
 */
export function emailBody(content: string): string {
  return `<div style="padding:28px 32px; color:${BLACK}; font-size:14px; line-height:1.7;">${content}</div>`
}

/**
 * Info table (key-value pairs)
 */
export function infoTable(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; font-weight:600; color:${GREY}; width:120px; font-size:13px;">${r.label}</td>
      <td style="padding:10px 14px; border-bottom:1px solid #E8E8E9; color:${BLACK}; font-size:14px;">${r.value}</td>
    </tr>
  `).join('')

  return `
    <table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #E8E8E9; border-radius:8px; overflow:hidden;">
      ${rowsHtml}
    </table>
  `
}

/**
 * Approval action buttons (Approve / Reject)
 */
export function approvalButtons(opts: {
  approveUrl: string
  rejectUrl: string
  levelText?: string
  previousApprovals?: string
  dashboardUrl?: string
}): string {
  const { approveUrl, rejectUrl, levelText, previousApprovals, dashboardUrl } = opts

  return `
    <div style="margin:24px 0; padding:24px; background:${LIGHT_BG}; border:2px solid ${PRIMARY}; border-radius:10px; text-align:center;">
      ${levelText ? `<p style="margin:0 0 4px; font-size:13px; color:${PRIMARY}; font-weight:700;">${levelText}</p>` : ''}
      ${previousApprovals ? `<p style="margin:0 0 12px; font-size:12px; color:${GREY};">${previousApprovals}</p>` : ''}
      <p style="margin:0 0 20px; font-size:16px; font-weight:700; color:${BLACK};">กรุณาพิจารณาอนุมัติ PO นี้</p>
      <div>
        <a href="${approveUrl}" style="display:inline-block; padding:12px 36px; background:${SUCCESS}; color:white; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; margin:0 6px;">Approve</a>
        <a href="${rejectUrl}" style="display:inline-block; padding:12px 36px; background:${DANGER}; color:white; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; margin:0 6px;">Reject</a>
      </div>
      <p style="margin:16px 0 0; font-size:11px; color:#ABB1BA;">ลิงก์นี้ใช้ได้ภายใน 7 วัน</p>
      ${dashboardUrl ? `<p style="margin:8px 0 0; font-size:12px; color:${GREY};">หรือเข้า <a href="${dashboardUrl}" style="color:${PRIMARY}; text-decoration:underline;">Dashboard</a> เพื่ออนุมัติ</p>` : ''}
    </div>
  `
}

/**
 * Status box (success / danger / info)
 */
export function statusBox(text: string, type: 'success' | 'danger' | 'info' | 'warning' = 'info'): string {
  const styles = {
    success: { bg: '#E6F7ED', border: SUCCESS, color: SUCCESS },
    danger: { bg: '#FCEEEA', border: DANGER, color: DANGER },
    info: { bg: LIGHT_BG, border: PRIMARY, color: PRIMARY },
    warning: { bg: '#FEF9E6', border: WARNING, color: '#92400E' },
  }
  const s = styles[type]
  return `
    <div style="background:${s.bg}; border:1px solid ${s.border}; border-radius:8px; padding:14px 18px; margin:16px 0;">
      <p style="margin:0; font-size:14px; color:${s.color}; font-weight:600;">${text}</p>
    </div>
  `
}

/**
 * Mini approve/reject buttons for reminder table rows
 */
export function miniApprovalButtons(approveUrl: string, rejectUrl: string): string {
  return `
    <a href="${approveUrl}" style="display:inline-block; padding:6px 14px; background:${SUCCESS}; color:white; text-decoration:none; border-radius:6px; font-size:11px; font-weight:600; margin-right:4px;">Approve</a>
    <a href="${rejectUrl}" style="display:inline-block; padding:6px 14px; background:${DANGER}; color:white; text-decoration:none; border-radius:6px; font-size:11px; font-weight:600;">Reject</a>
  `
}

/**
 * Level badge for email tables
 */
export function levelBadge(currentLevel: number, maxLevel: number): string {
  if (maxLevel <= 1) return ''
  return `<span style="display:inline-block; padding:2px 8px; background:#CCE0F5; color:${PRIMARY}; border-radius:10px; font-size:11px; font-weight:600; margin-left:4px;">Level ${currentLevel}/${maxLevel}</span>`
}

/**
 * Pending status badge
 */
export function pendingBadge(currentLevel: number, maxLevel: number): string {
  if (maxLevel > 1) {
    return `<span style="display:inline-block; padding:4px 12px; background:#FEF9E6; color:#92400E; border-radius:12px; font-size:12px; font-weight:600;">รอ Level ${currentLevel}/${maxLevel}</span>`
  }
  return `<span style="display:inline-block; padding:4px 12px; background:#FEF9E6; color:#92400E; border-radius:12px; font-size:12px; font-weight:600;">รอการอนุมัติ</span>`
}

/**
 * CTA button
 */
export function ctaButton(text: string, url: string, color: string = PRIMARY): string {
  return `
    <div style="text-align:center; margin:20px 0;">
      <a href="${url}" style="display:inline-block; padding:12px 32px; background:${color}; color:white; text-decoration:none; border-radius:8px; font-weight:700; font-size:14px;">${text}</a>
    </div>
  `
}

/**
 * Format currency for email
 */
export function emailCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

// Re-export colors for external use
export const EMAIL_COLORS = { PRIMARY, PRIMARY_DARK, CYAN, SUCCESS, DANGER, WARNING, GREY, BLACK, LIGHT_BG }

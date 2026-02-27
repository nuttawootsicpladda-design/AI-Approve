import { generateApprovalToken, getApprovalUrl } from './approval'
import {
  getActiveApprovalLevels,
  createApprovalStep,
  getApprovalStepsForPO,
  updateApprovalStep,
  updateRecord,
  getRecordById,
} from './db'
import { sendEmail, moveMultipleSharePointFiles } from './microsoft-graph'
import { ApprovalLevelConfig } from './types'
import {
  wrapEmailLayout,
  emailHeader,
  emailBody,
  infoTable,
  approvalButtons,
  statusBox,
  ctaButton,
  emailCurrency,
} from './email-template'

/**
 * Determine max approval level needed for a given PO total
 */
export async function determineMaxLevel(total: number): Promise<{
  maxLevel: number
  levels: ApprovalLevelConfig[]
}> {
  const levels = await getActiveApprovalLevels()

  if (levels.length === 0) {
    // No levels configured — single-level fallback
    return { maxLevel: 1, levels: [] }
  }

  let maxLevel = 1
  for (const config of levels) {
    if (config.maxAmount === null || total > config.maxAmount) {
      // Total exceeds this level's max — needs next level
      maxLevel = config.level + 1
    } else {
      // This level can handle it
      maxLevel = config.level
      break
    }
  }

  // Cap at number of configured levels
  maxLevel = Math.min(maxLevel, levels.length)
  return { maxLevel, levels: levels.slice(0, maxLevel) }
}

/**
 * Initialize approval for a new PO:
 * - Calculate max approval level
 * - Create first approval step
 * - Generate token
 * - Return level 1 approver info
 */
export async function initializeApproval(poRecordId: string, total: number): Promise<{
  approverEmail: string
  approvalToken: string
  approveUrl: string
  rejectUrl: string
  maxLevel: number
  levelName: string
} | null> {
  const { maxLevel, levels } = await determineMaxLevel(total)

  if (levels.length === 0) {
    // No levels configured — cannot initialize
    return null
  }

  const level1Config = levels[0]
  const token = generateApprovalToken(poRecordId, 1)
  const approveUrl = getApprovalUrl(token, 'approve')
  const rejectUrl = getApprovalUrl(token, 'reject')

  // Create approval step for level 1
  await createApprovalStep({
    poRecordId,
    level: 1,
    approverEmail: level1Config.approverEmail,
    approvalToken: token,
  })

  // Update PO record with level info
  await updateRecord(poRecordId, {
    currentApprovalLevel: 1,
    maxApprovalLevel: maxLevel,
    sentTo: level1Config.approverEmail,
    approvalToken: token,
  })

  return {
    approverEmail: level1Config.approverEmail,
    approvalToken: token,
    approveUrl,
    rejectUrl,
    maxLevel,
    levelName: level1Config.levelName,
  }
}

/**
 * Process an approval action at the current level
 */
export async function processApprovalAction(params: {
  poRecordId: string
  stepId: string
  action: 'approve' | 'reject'
  comment?: string
}): Promise<{
  success: boolean
  isFinalized: boolean
  nextLevel?: number
  nextLevelName?: string
  error?: string
}> {
  const { poRecordId, stepId, action, comment } = params
  const now = new Date().toISOString()

  const record = await getRecordById(poRecordId)
  if (!record) {
    return { success: false, isFinalized: false, error: 'PO record not found' }
  }

  if (record.approvalStatus !== 'pending') {
    return { success: false, isFinalized: false, error: 'PO is already processed' }
  }

  // Update the approval step
  const updatedStep = await updateApprovalStep(stepId, {
    status: action === 'approve' ? 'approved' : 'rejected',
    comment,
    actedAt: now,
  })

  if (!updatedStep) {
    return { success: false, isFinalized: false, error: 'Failed to update approval step' }
  }

  if (action === 'reject') {
    await handleRejection(poRecordId, updatedStep.level, comment)
    return { success: true, isFinalized: true }
  }

  // Approved — check if more levels needed
  const currentLevel = record.currentApprovalLevel || 1
  const maxLevel = record.maxApprovalLevel || 1

  if (currentLevel < maxLevel) {
    // Route to next level
    const nextLevel = currentLevel + 1
    const nextLevelName = await routeToNextLevel(poRecordId, nextLevel, record)
    return {
      success: true,
      isFinalized: false,
      nextLevel,
      nextLevelName: nextLevelName || `Level ${nextLevel}`,
    }
  } else {
    // Final approval
    await finalizeApproval(poRecordId, comment)
    return { success: true, isFinalized: true }
  }
}

/**
 * Route PO to the next approval level
 */
async function routeToNextLevel(
  poRecordId: string,
  nextLevel: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Promise<string | null> {
  const levels = await getActiveApprovalLevels()
  const nextConfig = levels.find(l => l.level === nextLevel)

  if (!nextConfig) {
    // No config for next level — finalize instead
    await finalizeApproval(poRecordId)
    return null
  }

  // Generate new token for next level
  const token = generateApprovalToken(poRecordId, nextLevel)
  const approveUrl = getApprovalUrl(token, 'approve')
  const rejectUrl = getApprovalUrl(token, 'reject')

  // Create approval step for next level
  await createApprovalStep({
    poRecordId,
    level: nextLevel,
    approverEmail: nextConfig.approverEmail,
    approvalToken: token,
  })

  // Update PO record
  await updateRecord(poRecordId, {
    currentApprovalLevel: nextLevel,
    sentTo: nextConfig.approverEmail,
    approvalToken: token,
  })

  const maxLevel = record.maxApprovalLevel || 1
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Get previous approval steps for context
  const steps = await getApprovalStepsForPO(poRecordId)
  const previousApprovals = steps
    .filter(s => s.status === 'approved')
    .map(s => `Level ${s.level}: ${s.approverEmail} (${new Date(s.actedAt!).toLocaleDateString('th-TH')})`)
    .join('<br>')

  // Send email to next level approver
  const approvalButtonsHtml = approvalButtons({
    approveUrl,
    rejectUrl,
    levelText: `การอนุมัติ Level ${nextLevel} of ${maxLevel} (${nextConfig.levelName})`,
    previousApprovals: previousApprovals || undefined,
    dashboardUrl: `${baseUrl}/dashboard`,
  })

  try {
    const nextLevelHtml = wrapEmailLayout(`
      ${emailHeader(`PO Approval — Level ${nextLevel}/${maxLevel}`, 'primary')}
      ${emailBody(`
        <p>เรียน ผู้อนุมัติ Level ${nextLevel} (${nextConfig.levelName}),</p>
        <p>PO <strong>${record.fileName}</strong> ผ่านการอนุมัติ Level ${nextLevel - 1} แล้ว กรุณาพิจารณาอนุมัติ</p>
        ${infoTable([
          { label: 'ไฟล์', value: record.fileName },
          { label: 'ยอดรวม', value: emailCurrency(Number(record.total)) },
          { label: 'ผู้ส่ง', value: record.createdBy || record.sentFrom },
        ])}
        ${approvalButtonsHtml}
      `)}
    `)

    await sendEmail({
      to: nextConfig.approverEmail,
      subject: `[PO Approval] Level ${nextLevel}/${maxLevel} - ${record.fileName}`,
      htmlBody: nextLevelHtml,
    })
  } catch (error) {
    console.error('Error sending email to next level approver:', error)
  }

  // Notify the sender about progress
  try {
    const statusHtml = wrapEmailLayout(`
      ${emailHeader('PO Status Update', 'cyan')}
      ${emailBody(`
        <p>PO <strong>${record.fileName}</strong> ผ่านการอนุมัติ Level ${nextLevel - 1} แล้ว</p>
        <p>ขณะนี้รอการอนุมัติจาก Level ${nextLevel} (${nextConfig.levelName})</p>
        ${statusBox(`สถานะ: Level ${nextLevel - 1} of ${maxLevel} ผ่านแล้ว — รอ Level ${nextLevel}`, 'info')}
        ${ctaButton('ดู Dashboard', `${baseUrl}/dashboard`)}
      `)}
    `)

    await sendEmail({
      to: record.createdBy || record.sentFrom,
      subject: `[PO Status] ${record.fileName} - อนุมัติ Level ${nextLevel - 1} แล้ว รอ Level ${nextLevel}`,
      htmlBody: statusHtml,
    })
  } catch (error) {
    console.error('Error sending status update to sender:', error)
  }

  return nextConfig.levelName
}

/**
 * Finalize a PO (final approval)
 */
async function finalizeApproval(poRecordId: string, comment?: string): Promise<void> {
  const now = new Date().toISOString()
  const record = await getRecordById(poRecordId)
  if (!record) return

  // Update PO record to approved
  await updateRecord(poRecordId, {
    approvalStatus: 'approved',
    approvedAt: now,
    approvalComment: comment,
  })

  // Move SharePoint files
  if (record.sharePointFiles && record.sharePointFiles.length > 0 && record.approvedFolderPath) {
    try {
      await moveMultipleSharePointFiles(
        record.sharePointFiles.map(f => ({ driveId: f.driveId, fileId: f.fileId })),
        record.approvedFolderPath
      )
    } catch (error) {
      console.error('Error moving SharePoint files:', error)
    }
  }

  // Get all steps for the timeline summary
  const steps = await getApprovalStepsForPO(poRecordId)
  const timelineHtml = steps
    .filter(s => s.status === 'approved')
    .map(s => `<li>Level ${s.level}: ${s.approverEmail} - ${new Date(s.actedAt!).toLocaleDateString('th-TH')}</li>`)
    .join('')

  // Send notification to sender
  try {
    const approvedHtml = wrapEmailLayout(`
      ${emailHeader('PO Approved', 'success')}
      ${emailBody(`
        <p>PO <strong>${record.fileName}</strong> ได้รับการอนุมัติครบทุกลำดับขั้นแล้ว</p>
        ${infoTable([
          { label: 'ไฟล์', value: record.fileName },
          { label: 'ยอดรวม', value: emailCurrency(Number(record.total)) },
        ])}
        ${timelineHtml ? `<p style="font-weight:600;">ลำดับการอนุมัติ:</p><ul style="margin:8px 0 16px;">${timelineHtml}</ul>` : ''}
        ${comment ? statusBox(`หมายเหตุ: ${comment}`, 'info') : ''}
        ${statusBox('สถานะ: พร้อมส่งให้ Supplier', 'success')}
      `)}
    `)

    await sendEmail({
      to: record.createdBy || record.sentFrom,
      subject: `[PO Approved] ${record.fileName} - อนุมัติเรียบร้อยแล้ว`,
      htmlBody: approvedHtml,
    })
  } catch (error) {
    console.error('Error sending final approval notification:', error)
  }
}

/**
 * Handle rejection at any level
 */
async function handleRejection(poRecordId: string, level: number, comment?: string): Promise<void> {
  const now = new Date().toISOString()
  const record = await getRecordById(poRecordId)
  if (!record) return

  const levels = await getActiveApprovalLevels()
  const levelConfig = levels.find(l => l.level === level)
  const levelName = levelConfig?.levelName || `Level ${level}`

  // Update PO record to rejected
  await updateRecord(poRecordId, {
    approvalStatus: 'rejected',
    rejectedAt: now,
    approvalComment: comment,
  })

  // Send rejection notification to sender
  try {
    const rejectedHtml = wrapEmailLayout(`
      ${emailHeader('PO Rejected', 'danger')}
      ${emailBody(`
        <p>PO <strong>${record.fileName}</strong> ถูกปฏิเสธที่ ${levelName} (Level ${level})</p>
        ${infoTable([
          { label: 'ไฟล์', value: record.fileName },
          { label: 'ยอดรวม', value: emailCurrency(Number(record.total)) },
          { label: 'ปฏิเสธโดย', value: `${levelName} (Level ${level})` },
        ])}
        ${comment ? statusBox(`เหตุผล: ${comment}`, 'danger') : ''}
        ${statusBox('กรุณาตรวจสอบและแก้ไขก่อนส่งใหม่', 'warning')}
      `)}
    `)

    await sendEmail({
      to: record.createdBy || record.sentFrom,
      subject: `[PO Rejected] ${record.fileName} - ไม่อนุมัติจาก ${levelName}`,
      htmlBody: rejectedHtml,
    })
  } catch (error) {
    console.error('Error sending rejection notification:', error)
  }
}

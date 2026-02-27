'use client'

import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { POTable } from '@/components/POTable'
import { EmailPreview } from '@/components/EmailPreview'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SharePointBrowser, SharePointFile } from '@/components/SharePointBrowser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { POItem, Language, SharePointFileInfo } from '@/lib/types'
import { translations } from '@/lib/translations'
import {
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  FolderOpen,
  Paperclip,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/types'
import { NavBar } from '@/components/NavBar'
import { format } from 'date-fns'

type Step = 'upload' | 'preview' | 'sent'
type UploadMethod = 'local' | 'sharepoint'

interface FileAttachment {
  name: string
  content: string // base64
  contentType: string
}

export default function Home() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const [step, setStep] = useState<Step>('upload')
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('local')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [items, setItems] = useState<POItem[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sentToEmail, setSentToEmail] = useState('')

  // File attachment state (single file for local upload)
  const [fileAttachment, setFileAttachment] = useState<FileAttachment | null>(null)
  // Multiple file attachments for SharePoint
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([])
  const [attachToEmail, setAttachToEmail] = useState(true)

  // SharePoint file info for moving files on approval
  const [sharePointFiles, setSharePointFiles] = useState<SharePointFileInfo[]>([])
  const [approvedFolderPath, setApprovedFolderPath] = useState('Approved')

  // User info from Microsoft login
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('employee')

  useEffect(() => {
    try {
      const userInfoCookie = document.cookie
        .split('; ')
        .find(c => c.startsWith('user-info='))
      if (userInfoCookie) {
        const value = decodeURIComponent(userInfoCookie.split('=')[1])
        const info = JSON.parse(value)
        setUserName(info.name || info.email || '')
        setUserEmail(info.email || '')
        setUserRole(info.role || 'employee')
      }
    } catch {}
  }, [])

  // Email settings
  const [emailSubject, setEmailSubject] = useState(
    `${translations[language].email.subject} - ${format(new Date(), 'dd/MM/yyyy')}`
  )

  const t = translations[language]

  // Handle local file upload
  const handleFileSelect = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setFileName(file.name)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract data')
      }

      setItems(result.data.items || [])

      // Store file as base64 for attachment
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let binary = ''
      uint8Array.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      const base64 = btoa(binary)
      setFileAttachment({
        name: file.name,
        content: base64,
        contentType: file.type || 'application/octet-stream',
      })

      setStep('preview')
      setSuccess(t.messages.extractSuccess)
    } catch (err: any) {
      setError(err.message || t.messages.error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle SharePoint file selection (multiple files)
  const handleSharePointFileSelect = async (
    files: SharePointFile[],
    driveId: string
  ) => {
    if (files.length === 0) return

    setIsProcessing(true)
    setError(null)
    setFileName(files.map((f) => f.name).join(', '))

    try {
      const allItems: POItem[] = []
      const allAttachments: FileAttachment[] = []

      // Process each file sequentially
      for (const file of files) {
        const response = await fetch('/api/sharepoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            driveId,
            fileId: file.id,
            fileName: file.name,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(`Failed to process ${file.name}: ${result.error}`)
        }

        // Collect items from all files
        if (result.data.items && result.data.items.length > 0) {
          allItems.push(...result.data.items)
        }

        // Collect attachments
        allAttachments.push({
          name: file.name,
          content: result.data.fileBase64,
          contentType: result.data.contentType || 'application/octet-stream',
        })
      }

      setItems(allItems)

      // Store SharePoint file info for moving files on approval
      setSharePointFiles(
        files.map((f) => ({
          driveId,
          fileId: f.id,
          fileName: f.name,
          webUrl: f.webUrl,
        }))
      )

      // Store all files as attachments (we'll use the first one for single attachment display)
      // For multiple files, store all attachments
      if (allAttachments.length === 1) {
        setFileAttachment(allAttachments[0])
      } else if (allAttachments.length > 1) {
        // Store multiple attachments - we'll need to update the state type
        setFileAttachments(allAttachments)
        setFileAttachment(null) // Clear single attachment
      }

      setStep('preview')
      setSuccess(
        files.length === 1
          ? t.messages.extractSuccess
          : `${t.messages.extractSuccess} (${files.length} files)`
      )
    } catch (err: any) {
      setError(err.message || t.messages.error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendEmail = async () => {
    setIsSending(true)
    setError(null)

    try {
      // Merge items with the same name AND same PO number (aggregate quantity and usd)
      const mergedItemsMap = new Map<string, { name: string; quantity: number; cost: number; poNo: string; usd: number }>()

      items.forEach((item) => {
        // Use both name and PO number as the key - only merge if both match
        const key = `${item.name.trim().toLowerCase()}|${item.poNo.trim()}`
        if (mergedItemsMap.has(key)) {
          const existing = mergedItemsMap.get(key)!
          existing.quantity += Number(item.quantity)
          existing.usd += Number(item.usd)
        } else {
          mergedItemsMap.set(key, {
            name: item.name,
            quantity: Number(item.quantity),
            cost: Number(item.cost),
            poNo: item.poNo,
            usd: Number(item.usd),
          })
        }
      })

      const mergedItems = Array.from(mergedItemsMap.values())

      // Generate HTML table
      const tableRows = mergedItems
        .map(
          (item, index) => `
        <tr>
          <td style="border:1px solid #000;padding:8px;text-align:center;">${index + 1}</td>
          <td style="border:1px solid #000;padding:8px;">${item.name}</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;">${Number(
            item.quantity
          ).toLocaleString()}</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;">${Number(
            item.cost
          ).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:8px;">${item.poNo}</td>
          <td style="border:1px solid #000;padding:8px;text-align:right;">${Number(
            item.usd
          ).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      `
        )
        .join('')

      const total = mergedItems.reduce((sum, item) => sum + Number(item.usd), 0)

      const htmlTable = `
        <table style="border-collapse:collapse;font-family:'Public Sans',Arial,sans-serif;font-size:14px;width:100%;">
          <thead>
            <tr style="background-color:#004F9F;color:white;">
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.no}</th>
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.name}</th>
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.quantity}</th>
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.cost}</th>
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.poNo}</th>
              <th style="border:1px solid #003F7F;padding:8px;">${t.table.usd}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr style="background-color:#f3f4f6;font-weight:bold;">
              <td colspan="5" style="border:1px solid #000;padding:8px;text-align:right;">${
                t.table.total
              }</td>
              <td style="border:1px solid #000;padding:8px;text-align:right;">${total.toLocaleString(
                undefined,
                { minimumFractionDigits: 2 }
              )}</td>
            </tr>
          </tfoot>
        </table>
      `

      const htmlBody = `
        ${t.email.greeting}<br><br>
        ${t.email.body}<br><br>
        ${htmlTable}
      `

      // Prepare attachments (support both single and multiple files)
      let attachments: { name: string; content: string }[] | undefined

      if (attachToEmail) {
        if (fileAttachments.length > 0) {
          // Multiple files from SharePoint
          attachments = fileAttachments.map((att) => ({
            name: att.name,
            content: att.content,
          }))
        } else if (fileAttachment) {
          // Single file from local upload
          attachments = [
            {
              name: fileAttachment.name,
              content: fileAttachment.content,
            },
          ]
        }
      }

      // Build request body
      const requestBody = {
        subject: emailSubject,
        htmlBody,
        items,
        fileName,
        attachments,
        // Include SharePoint file info for moving files on approval
        sharePointFiles: sharePointFiles.length > 0 ? sharePointFiles : undefined,
        approvedFolderPath: sharePointFiles.length > 0 ? approvedFolderPath : undefined,
        senderEmail: 'procurement.noreply@icpladda.com',
        createdBy: userEmail,
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // Handle non-JSON responses (e.g., 413 Request Entity Too Large)
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      setSentToEmail(result.sentTo || '')
      setStep('sent')
      setSuccess(t.messages.emailSent)

      // Send Line Notify if token is saved
      const lineToken = localStorage.getItem('line-notify-token')
      if (lineToken) {
        try {
          const total = mergedItems.reduce((sum, item) => sum + Number(item.usd), 0)
          await fetch('/api/line-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: lineToken,
              message: `\n📧 ส่ง PO สำเร็จ!\n📁 ไฟล์: ${fileName}\n💰 ยอดรวม: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            }),
          })
        } catch (lineErr) {
          console.error('Line Notify error:', lineErr)
        }
      }
    } catch (err: any) {
      console.error('Send email error:', err)
      setError(err.message || t.messages.error)
    } finally {
      setIsSending(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setItems([])
    setFileName('')
    setError(null)
    setSuccess(null)
    setFileAttachment(null)
    setFileAttachments([])
    setAttachToEmail(true)
    setSharePointFiles([])
    setSentToEmail('')
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <NavBar
          activePage="home"
          userRole={userRole}
          userName={userName}
          onLogout={handleLogout}
          rightContent={
            <LanguageSwitcher currentLanguage={language} onLanguageChange={setLanguage} />
          }
        />

        {/* Error/Success Messages */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-3 p-4">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-icp-success bg-icp-success-light">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="h-5 w-5 text-icp-success flex-shrink-0" />
              <p className="text-sm text-icp-success">{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Upload Method Selector */}
            <Card>
              <CardHeader>
                <CardTitle>{t.uploadMethod}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    variant={uploadMethod === 'sharepoint' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('sharepoint')}
                    className={`flex-1 ${uploadMethod === 'sharepoint' ? 'bg-icp-primary hover:bg-icp-primary-dark' : ''}`}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {t.sharePointUpload}
                  </Button>
                  <Button
                    variant={uploadMethod === 'local' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('local')}
                    className={`flex-1 ${uploadMethod === 'local' ? 'bg-icp-primary hover:bg-icp-primary-dark' : ''}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t.localUpload}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SharePoint Browser */}
            {uploadMethod === 'sharepoint' && (
              <SharePointBrowser
                onFileSelect={handleSharePointFileSelect}
                isProcessing={isProcessing}
                translations={t.sharepoint}
              />
            )}

            {/* Local Upload */}
            {uploadMethod === 'local' && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.uploadFile}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={isProcessing}
                    translations={{
                      dropFile: t.dropFile,
                      supportedFormats: t.supportedFormats,
                      processing: t.extracting,
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step: Preview & Edit */}
        {step === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.preview}</CardTitle>
              </CardHeader>
              <CardContent>
                <POTable
                  items={items}
                  onChange={setItems}
                  editable={true}
                  translations={{
                    no: t.table.no,
                    name: t.table.name,
                    quantity: t.table.quantity,
                    cost: t.table.cost,
                    poNo: t.table.poNo,
                    usd: t.table.usd,
                    total: t.table.total,
                    edit: t.actions.edit,
                    delete: t.actions.delete,
                    save: t.actions.save,
                    cancel: t.actions.cancel,
                    addRow: t.actions.addRow,
                  }}
                />
              </CardContent>
            </Card>

            <EmailPreview
              subject={emailSubject}
              items={items}
              onSubjectChange={setEmailSubject}
              translations={{
                subject_label: t.email.subject_label,
                greeting: t.email.greeting,
                body: t.email.body,
                table: t.table,
              }}
            />

            {/* Attachment Option */}
            {(fileAttachment || fileAttachments.length > 0) && (
              <Card>
                <CardContent className="p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachToEmail}
                      onChange={(e) => setAttachToEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {t.email.attachFile}:{' '}
                      <strong>
                        {fileAttachments.length > 0
                          ? `${fileAttachments.length} files (${fileAttachments.map((f) => f.name).join(', ')})`
                          : fileAttachment?.name}
                      </strong>
                    </span>
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Approved Folder Path (for SharePoint files) - Hidden */}
            {/* {sharePointFiles.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      โฟลเดอร์ปลายทาง (Destination Folder)
                    </label>
                    <input
                      type="text"
                      value={approvedFolderPath}
                      onChange={(e) => setApprovedFolderPath(e.target.value)}
                      placeholder="เช่น Approved หรือ Approved/2024"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      หลังกด Send Email ไฟล์จะถูกย้ายไปยังโฟลเดอร์นี้โดยอัตโนมัติ
                    </p>
                  </div>
                </CardContent>
              </Card>
            )} */}

            <div className="flex gap-4">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                {t.actions.back}
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || items.length === 0}
                className="flex-1 bg-icp-primary hover:bg-icp-primary-dark"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.sending}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t.sendEmail}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Sent */}
        {step === 'sent' && (
          <Card className="text-center">
            <CardContent className="p-12">
              <CheckCircle className="h-16 w-16 text-icp-success mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Email Sent Successfully!</h2>
              <p className="text-muted-foreground mb-6">
                Your PO approval request has been sent to {sentToEmail}
                {attachToEmail && (fileAttachment || fileAttachments.length > 0) && (
                  <>
                    <br />
                    <span className="text-sm">
                      (with {fileAttachments.length > 0
                        ? `${fileAttachments.length} attachments: ${fileAttachments.map((f) => f.name).join(', ')}`
                        : `attachment: ${fileAttachment?.name}`})
                    </span>
                  </>
                )}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleReset} className="bg-icp-primary hover:bg-icp-primary-dark">Process Another PO</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

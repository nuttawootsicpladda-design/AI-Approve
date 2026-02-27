'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { formatCurrency } from '@/lib/utils'
import { POItem } from '@/lib/types'
import { Users, Loader2 } from 'lucide-react'

interface ApproverInfo {
  level: number
  levelName: string
  approverEmail: string
  maxAmount: number | null
}

interface EmailPreviewProps {
  subject: string
  items: POItem[]
  onSubjectChange: (value: string) => void
  translations: {
    subject_label: string
    greeting: string
    body: string
    table: {
      no: string
      name: string
      quantity: string
      cost: string
      poNo: string
      usd: string
      total: string
    }
  }
}

export function EmailPreview({
  subject,
  items,
  onSubjectChange,
  translations,
}: EmailPreviewProps) {
  const [approvers, setApprovers] = useState<ApproverInfo[]>([])
  const [loadingApprovers, setLoadingApprovers] = useState(true)

  const total = items.reduce((sum, item) => {
    const usd = typeof item.usd === 'number' ? item.usd : parseFloat(String(item.usd) || '0')
    return sum + (isNaN(usd) ? 0 : usd)
  }, 0)

  // Fetch approval level config to show who will receive the email
  useEffect(() => {
    async function fetchApprovers() {
      try {
        const res = await fetch('/api/admin/approval-levels')
        const data = await res.json()
        if (data.success && data.data) {
          setApprovers(
            data.data
              .filter((l: any) => l.isActive)
              .sort((a: any, b: any) => a.level - b.level)
              .map((l: any) => ({
                level: l.level,
                levelName: l.levelName,
                approverEmail: l.approverEmail,
                maxAmount: l.maxAmount,
              }))
          )
        }
      } catch {
        // ignore
      } finally {
        setLoadingApprovers(false)
      }
    }
    fetchApprovers()
  }, [])

  // Determine which levels this PO requires
  const requiredLevels = approvers.filter((_, index) => {
    if (index === 0) return true // Level 1 always required
    const prevLevel = approvers[index - 1]
    return prevLevel.maxAmount !== null && total > prevLevel.maxAmount
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto Approver Info */}
        <div className="rounded-lg border border-icp-primary/20 bg-icp-primary-light p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-icp-primary" />
            <span className="text-sm font-semibold text-icp-primary">ผู้อนุมัติ (อัตโนมัติจากระบบ)</span>
          </div>
          {loadingApprovers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </div>
          ) : approvers.length === 0 ? (
            <p className="text-sm text-icp-danger font-medium">
              ยังไม่ได้ตั้งค่าระดับการอนุมัติ กรุณาตั้งค่าใน Admin ก่อน
            </p>
          ) : (
            <div className="space-y-2">
              {approvers.map((a) => {
                const isRequired = requiredLevels.some(r => r.level === a.level)
                return (
                  <div
                    key={a.level}
                    className={`flex items-center gap-3 text-sm rounded-md px-3 py-2 ${
                      isRequired
                        ? 'bg-white border border-icp-primary/30'
                        : 'bg-gray-50 text-muted-foreground opacity-60'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isRequired
                        ? 'bg-icp-primary text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {a.level}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium">{a.levelName}</span>
                      <span className="mx-2 text-muted-foreground">—</span>
                      <span>{a.approverEmail}</span>
                    </div>
                    {isRequired ? (
                      <span className="text-xs bg-icp-success/10 text-icp-success px-2 py-0.5 rounded-full font-medium">
                        ต้องอนุมัติ
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">ไม่จำเป็น</span>
                    )}
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground mt-2">
                ยอดรวม ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} → ต้องผ่านการอนุมัติ {requiredLevels.length} ระดับ
              </p>
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            {translations.subject_label}
          </label>
          <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} />
        </div>

        {/* Email Body Preview */}
        <div className="border rounded-lg p-4 bg-white">
          <div className="space-y-3 text-sm">
            <p>{translations.greeting}</p>
            <p>{translations.body}</p>
            <div className="mt-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-icp-primary text-white">
                    <th className="border border-icp-primary-dark p-2 text-left">
                      {translations.table.no}
                    </th>
                    <th className="border border-icp-primary-dark p-2 text-left">
                      {translations.table.name}
                    </th>
                    <th className="border border-icp-primary-dark p-2 text-right">
                      {translations.table.quantity}
                    </th>
                    <th className="border border-icp-primary-dark p-2 text-right">
                      {translations.table.cost}
                    </th>
                    <th className="border border-icp-primary-dark p-2 text-left">
                      {translations.table.poNo}
                    </th>
                    <th className="border border-icp-primary-dark p-2 text-right">
                      {translations.table.usd}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-2">{item.name}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {Number(item.quantity).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {formatCurrency(Number(item.cost))}
                      </td>
                      <td className="border border-gray-300 p-2">{item.poNo}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {formatCurrency(Number(item.usd))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-100">
                    <td colSpan={5} className="border border-gray-300 p-2 text-right">
                      {translations.table.total}
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

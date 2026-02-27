'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { POItem } from '@/lib/types'

interface ApprovalStep {
  level: number
  approverEmail: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  actedAt?: string
}

interface ApprovalData {
  id: string
  fileName: string
  items: POItem[]
  total: number
  sentAt: string
  sentFrom: string
  createdBy?: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedAt?: string
  rejectedAt?: string
  approvalComment?: string
  currentApprovalLevel: number
  maxApprovalLevel: number
  currentLevel: number
  stepStatus: string
  steps: ApprovalStep[]
}

type PageStatus = 'loading' | 'ready' | 'processing' | 'success' | 'error' | 'already_processed'

function ApproveContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const actionParam = searchParams.get('action')

  const [status, setStatus] = useState<PageStatus>('loading')
  const [data, setData] = useState<ApprovalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(
    actionParam === 'approve' || actionParam === 'reject' ? actionParam : null
  )
  const [resultAction, setResultAction] = useState<'approve' | 'reject' | null>(null)
  const [resultData, setResultData] = useState<{ isFinalized?: boolean; nextLevel?: number; nextLevelName?: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch approval data
  useEffect(() => {
    if (!token) {
      setError('Invalid approval link')
      setStatus('error')
      return
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/approval?token=${token}`)
        const result = await response.json()

        if (!result.success) {
          setError(result.error)
          setStatus('error')
          return
        }

        setData(result.data)

        // Check if this specific step is already processed
        if (result.data.stepStatus !== 'pending') {
          setStatus('already_processed')
        } else if (result.data.approvalStatus !== 'pending') {
          setStatus('already_processed')
        } else {
          setStatus('ready')
        }
      } catch {
        setError('Failed to load approval data')
        setStatus('error')
      }
    }

    fetchData()
  }, [token])

  // Handle approval/rejection
  const handleAction = async (action: 'approve' | 'reject') => {
    setSelectedAction(action)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          comment: comment.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error)
        setStatus('error')
        setIsProcessing(false)
        return
      }

      setResultAction(action)
      setResultData(result.data)
      setStatus('success')
    } catch {
      setError('Failed to process approval')
      setStatus('error')
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Timeline component
  const renderTimeline = () => {
    if (!data || data.maxApprovalLevel <= 1) return null

    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {Array.from({ length: data.maxApprovalLevel }, (_, i) => {
          const level = i + 1
          const step = data.steps.find(s => s.level === level)
          const isCurrent = level === data.currentLevel

          let bgColor = 'bg-gray-200 text-icp-grey'
          let icon = <span className="text-sm font-bold">{level}</span>

          if (step?.status === 'approved') {
            bgColor = 'bg-icp-success text-white'
            icon = <CheckCircle className="h-4 w-4" />
          } else if (step?.status === 'rejected') {
            bgColor = 'bg-icp-danger text-white'
            icon = <XCircle className="h-4 w-4" />
          } else if (isCurrent) {
            bgColor = 'bg-icp-primary text-white animate-pulse'
            icon = <Clock className="h-4 w-4" />
          }

          return (
            <div key={level} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
                  {icon}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  Level {level}
                </span>
                {step?.approverEmail && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {step.approverEmail.split('@')[0]}
                  </span>
                )}
                {step?.actedAt && (
                  <span className="text-xs text-icp-success">
                    {new Date(step.actedAt).toLocaleDateString('th-TH')}
                  </span>
                )}
              </div>
              {level < data.maxApprovalLevel && (
                <ArrowRight className="h-4 w-4 text-gray-400 mt-[-20px]" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already processed state
  if (status === 'already_processed' && data) {
    const isApproved = data.approvalStatus === 'approved' || data.stepStatus === 'approved'
    return (
      <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8">
            <div className="text-center">
              {isApproved ? (
                <CheckCircle className="h-16 w-16 text-icp-success mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-icp-danger mx-auto mb-4" />
              )}
              <h2 className="text-xl font-bold mb-2">
                คำขอนี้ได้รับการ{isApproved ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว
              </h2>
              {data.approvedAt && (
                <p className="text-muted-foreground mb-4">เมื่อ {formatDate(data.approvedAt)}</p>
              )}
              {data.rejectedAt && (
                <p className="text-muted-foreground mb-4">เมื่อ {formatDate(data.rejectedAt)}</p>
              )}
              {data.approvalComment && (
                <div className="bg-muted p-3 rounded-md text-sm text-left mb-4">
                  <strong>หมายเหตุ:</strong> {data.approvalComment}
                </div>
              )}
            </div>
            {/* Show timeline */}
            {data.maxApprovalLevel > 1 && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium text-center mb-4">ลำดับการอนุมัติ</p>
                {renderTimeline()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    const isApproved = resultAction === 'approve'
    const isFinalized = resultData?.isFinalized
    return (
      <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            {isApproved ? (
              <CheckCircle className="h-16 w-16 text-icp-success mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-icp-danger mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {isApproved
                ? (isFinalized ? 'อนุมัติเรียบร้อยแล้ว! (Final)' : 'อนุมัติเรียบร้อยแล้ว!')
                : 'ปฏิเสธเรียบร้อยแล้ว'}
            </h2>
            <p className="text-muted-foreground">
              {isApproved
                ? (isFinalized
                    ? 'PO ได้รับการอนุมัติครบทุกลำดับขั้นแล้ว ระบบได้แจ้งเตือนผู้ส่งเรียบร้อยแล้ว'
                    : `ส่งต่อให้ ${resultData?.nextLevelName || `Level ${resultData?.nextLevel}`} พิจารณาต่อแล้ว`)
                : 'ระบบได้ทำการปฏิเสธและแจ้งเตือนผู้ส่งเรียบร้อยแล้ว'}
            </p>
            {isApproved && !isFinalized && resultData?.nextLevelName && (
              <div className="mt-4 p-3 bg-icp-primary-light border border-icp-primary-200 rounded-lg text-sm text-icp-primary">
                ระบบได้ส่ง email ถึงผู้อนุมัติ {resultData.nextLevelName} (Level {resultData.nextLevel}) แล้ว
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ready state - show approval form
  if (status === 'ready' && data) {
    const total = data.items.reduce((sum, item) => sum + Number(item.usd), 0)
    const isMultiLevel = data.maxApprovalLevel > 1
    const isLastLevel = data.currentLevel >= data.maxApprovalLevel
    const approveButtonText = isMultiLevel
      ? (isLastLevel ? 'อนุมัติ (Final Approve)' : `อนุมัติ (ส่งต่อ Level ${data.currentLevel + 1})`)
      : 'อนุมัติ (Approve)'

    return (
      <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-icp-primary" />
                คำขออนุมัติ PO
                {isMultiLevel && (
                  <span className="ml-2 px-3 py-1 bg-icp-primary-light text-icp-primary rounded-full text-sm font-medium">
                    Level {data.currentLevel} of {data.maxApprovalLevel}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">ไฟล์</p>
                  <p className="font-medium">{data.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">วันที่ส่ง</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDate(data.sentAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ผู้ส่ง</p>
                  <p className="font-medium">{data.createdBy || data.sentFrom}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ยอดรวม</p>
                  <p className="font-bold text-lg text-icp-success">
                    ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              {isMultiLevel && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">ลำดับการอนุมัติ:</p>
                  {renderTimeline()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>รายการสินค้า</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-icp-primary text-white">
                      <th className="border border-icp-primary-dark p-2 text-left">ลำดับ</th>
                      <th className="border border-icp-primary-dark p-2 text-left">ชื่อสินค้า</th>
                      <th className="border border-icp-primary-dark p-2 text-right">จำนวน</th>
                      <th className="border border-icp-primary-dark p-2 text-right">ราคา</th>
                      <th className="border border-icp-primary-dark p-2 text-left">เลขที่ PO</th>
                      <th className="border border-icp-primary-dark p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, index) => (
                      <tr key={index}>
                        <td className="border p-2 text-center">{index + 1}</td>
                        <td className="border p-2">{item.name}</td>
                        <td className="border p-2 text-right">
                          {Number(item.quantity).toLocaleString()}
                        </td>
                        <td className="border p-2 text-right">
                          ${Number(item.cost).toFixed(2)}
                        </td>
                        <td className="border p-2">{item.poNo}</td>
                        <td className="border p-2 text-right">
                          ${Number(item.usd).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold">
                      <td colSpan={5} className="border p-2 text-right">
                        รวมทั้งหมด
                      </td>
                      <td className="border p-2 text-right">
                        ${total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Comment */}
          <Card>
            <CardHeader>
              <CardTitle>หมายเหตุ (ถ้ามี)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="กรอกหมายเหตุเพิ่มเติม..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={isProcessing}
                  className="flex-1 bg-icp-success hover:bg-icp-success-dark text-white py-6 text-lg"
                >
                  {isProcessing && selectedAction === 'approve' ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  {approveButtonText}
                </Button>
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={isProcessing}
                  className="flex-1 bg-icp-danger hover:bg-icp-danger/90 text-white py-6 text-lg"
                >
                  {isProcessing && selectedAction === 'reject' ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-2" />
                  )}
                  ไม่อนุมัติ (Reject)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ApproveContent />
    </Suspense>
  )
}

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
} from 'lucide-react'
import { POItem } from '@/lib/types'

interface ApprovalData {
  id: string
  fileName: string
  items: POItem[]
  total: number
  sentAt: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedAt?: string
  rejectedAt?: string
  approvalComment?: string
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

        if (result.data.approvalStatus !== 'pending') {
          setStatus('already_processed')
        } else {
          setStatus('ready')
        }
      } catch (err) {
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      setStatus('success')
    } catch (err) {
      setError('Failed to process approval')
      setStatus('error')
      setIsProcessing(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
    const isApproved = data.approvalStatus === 'approved'
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            {isApproved ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-bold mb-2">
              คำขอนี้ได้รับการ{isApproved ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว
            </h2>
            <p className="text-muted-foreground mb-4">
              เมื่อ {formatDate(isApproved ? data.approvedAt! : data.rejectedAt!)}
            </p>
            {data.approvalComment && (
              <div className="bg-muted p-3 rounded-md text-sm text-left">
                <strong>หมายเหตุ:</strong> {data.approvalComment}
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            {isApproved ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {isApproved ? 'อนุมัติเรียบร้อยแล้ว!' : 'ปฏิเสธเรียบร้อยแล้ว'}
            </h2>
            <p className="text-muted-foreground">
              {isApproved
                ? 'ระบบได้ทำการอนุมัติและแจ้งเตือนผู้ส่งเรียบร้อยแล้ว'
                : 'ระบบได้ทำการปฏิเสธและแจ้งเตือนผู้ส่งเรียบร้อยแล้ว'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ready state - show approval form
  if (status === 'ready' && data) {
    const total = data.items.reduce((sum, item) => sum + Number(item.usd), 0)

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                คำขออนุมัติ PO
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
              </div>
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
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">ลำดับ</th>
                      <th className="border p-2 text-left">ชื่อสินค้า</th>
                      <th className="border p-2 text-right">จำนวน</th>
                      <th className="border p-2 text-right">ราคา</th>
                      <th className="border p-2 text-left">เลขที่ PO</th>
                      <th className="border p-2 text-right">USD</th>
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                >
                  {isProcessing && selectedAction === 'approve' ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  )}
                  อนุมัติ (Approve)
                </Button>
                <Button
                  onClick={() => handleAction('reject')}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1 py-6 text-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  ArrowLeft,
  RefreshCw,
  Bell,
  Calendar,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { POItem } from '@/lib/types'

interface DashboardData {
  summary: {
    totalPOs: number
    pendingCount: number
    totalAmount: number
    thisMonthCount: number
    thisMonthAmount: number
    countGrowth: number
    amountGrowth: number
  }
  monthlyData: {
    month: string
    sent: number
    amount: number
  }[]
  topRecipients: {
    email: string
    count: number
    amount: number
  }[]
  recentActivity: {
    id: string
    fileName: string
    sentTo: string
    total: number
    sentAt: string
  }[]
}

interface PendingRecord {
  id: string
  fileName: string
  sentTo: string
  sentFrom: string
  total: number
  sentAt: string
  createdBy?: string
  items: POItem[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLineNotify, setShowLineNotify] = useState(false)
  const [lineToken, setLineToken] = useState('')
  const [isSavingToken, setIsSavingToken] = useState(false)

  // Pending approval state
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [showCommentFor, setShowCommentFor] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)

  const fetchDashboard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPending = async () => {
    setPendingLoading(true)
    try {
      const response = await fetch('/api/dashboard/pending')
      const result = await response.json()
      if (result.success) {
        setPendingRecords(result.data)
      }
    } catch {
      console.error('Failed to fetch pending records')
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    fetchPending()
    const savedToken = localStorage.getItem('line-notify-token')
    if (savedToken) {
      setLineToken(savedToken)
    }
  }, [])

  const handleApprovalAction = async (recordId: string, action: 'approve' | 'reject') => {
    setProcessingId(recordId)
    try {
      const response = await fetch('/api/dashboard/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, action, comment: approvalComment }),
      })
      const result = await response.json()
      if (result.success) {
        setPendingRecords(prev => prev.filter(r => r.id !== recordId))
        setShowCommentFor(null)
        setApprovalComment('')
        fetchDashboard()
      } else {
        alert(result.error || 'Failed to process approval')
      }
    } catch {
      alert('Failed to process approval')
    } finally {
      setProcessingId(null)
    }
  }

  const openCommentDialog = (id: string, action: 'approve' | 'reject') => {
    setShowCommentFor({ id, action })
    setApprovalComment('')
  }

  const saveLineToken = () => {
    setIsSavingToken(true)
    localStorage.setItem('line-notify-token', lineToken)
    setTimeout(() => {
      setIsSavingToken(false)
      setShowLineNotify(false)
    }, 500)
  }

  const testLineNotify = async () => {
    if (!lineToken) {
      alert('กรุณาใส่ Line Notify Token ก่อน')
      return
    }
    try {
      const response = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: lineToken,
          message: 'ทดสอบการแจ้งเตือนจาก PO Approval System สำเร็จ!',
        }),
      })
      const result = await response.json()
      if (result.success) {
        alert('ส่งข้อความทดสอบสำเร็จ! ตรวจสอบ Line ของคุณ')
      } else {
        alert('ส่งไม่สำเร็จ: ' + result.error)
      }
    } catch {
      alert('เกิดข้อผิดพลาด')
    }
  }

  // Calculate max for chart scaling
  const maxMonthlyValue = data?.monthlyData
    ? Math.max(...data.monthlyData.map(d => d.sent), 1)
    : 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-primary" />
                Dashboard
                {pendingRecords.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingRecords.length}
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground">ภาพรวมการส่ง PO</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLineNotify(!showLineNotify)}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Line Notify
            </Button>
            <Button variant="outline" onClick={() => { fetchDashboard(); fetchPending() }} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Line Notify Config */}
        {showLineNotify && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                ตั้งค่า Line Notify
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Line Notify Token</label>
                <input
                  type="password"
                  value={lineToken}
                  onChange={(e) => setLineToken(e.target.value)}
                  placeholder="ใส่ Token จาก notify-bot.line.me"
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  รับ Token ได้ที่{' '}
                  <a
                    href="https://notify-bot.line.me/my/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 underline"
                  >
                    notify-bot.line.me/my
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveLineToken} disabled={isSavingToken} className="bg-green-600 hover:bg-green-700">
                  {isSavingToken ? 'กำลังบันทึก...' : 'บันทึก Token'}
                </Button>
                <Button variant="outline" onClick={testLineNotify}>
                  ทดสอบส่งข้อความ
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals Section */}
        {!pendingLoading && pendingRecords.length > 0 && (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                PO รอการอนุมัติ ({pendingRecords.length} รายการ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRecords.map(record => (
                  <div key={record.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold text-sm truncate">{record.fileName}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">ส่งถึง:</span> {record.sentTo}
                          </div>
                          <div>
                            <span className="font-medium">ผู้ส่ง:</span> {record.createdBy || record.sentFrom}
                          </div>
                          <div>
                            <span className="font-medium">ยอดรวม:</span>{' '}
                            <span className="text-green-700 font-bold">{formatCurrency(record.total)}</span>
                          </div>
                          <div>
                            <span className="font-medium">วันที่:</span>{' '}
                            {new Date(record.sentAt).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {processingId === record.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : showCommentFor?.id === record.id ? null : (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openCommentDialog(record.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openCommentDialog(record.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ไม่อนุมัติ
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comment Dialog */}
                    {showCommentFor?.id === record.id && (
                      <div className="mt-3 pt-3 border-t">
                        <label className="text-sm font-medium block mb-1">
                          หมายเหตุ (ไม่บังคับ)
                        </label>
                        <textarea
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          placeholder="ใส่หมายเหตุ..."
                          className="w-full p-2 border rounded-md text-sm mb-2"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className={showCommentFor.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                            variant={showCommentFor.action === 'reject' ? 'destructive' : 'default'}
                            onClick={() => handleApprovalAction(record.id, showCommentFor.action)}
                            disabled={processingId === record.id}
                          >
                            {processingId === record.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : showCommentFor.action === 'approve' ? (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            {showCommentFor.action === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setShowCommentFor(null); setApprovalComment('') }}
                          >
                            ยกเลิก
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">PO ทั้งหมด</p>
                      <p className="text-3xl font-bold">{data.summary.totalPOs}</p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">ยอดรวมทั้งหมด</p>
                      <p className="text-2xl font-bold">{formatCurrency(data.summary.totalAmount)}</p>
                    </div>
                    <DollarSign className="h-10 w-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">เดือนนี้</p>
                      <p className="text-3xl font-bold">{data.summary.thisMonthCount}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {data.summary.countGrowth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="text-xs">
                          {data.summary.countGrowth >= 0 ? '+' : ''}{data.summary.countGrowth}% จากเดือนก่อน
                        </span>
                      </div>
                    </div>
                    <Calendar className="h-10 w-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">ยอดเดือนนี้</p>
                      <p className="text-2xl font-bold">{formatCurrency(data.summary.thisMonthAmount)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {data.summary.amountGrowth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="text-xs">
                          {data.summary.amountGrowth >= 0 ? '+' : ''}{data.summary.amountGrowth}% จากเดือนก่อน
                        </span>
                      </div>
                    </div>
                    <TrendingUp className="h-10 w-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    PO รายเดือน (6 เดือนล่าสุด)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.monthlyData.map((month, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{month.month}</span>
                          <span className="text-muted-foreground">
                            {month.sent} รายการ | {formatCurrency(month.amount)}
                          </span>
                        </div>
                        <div className="h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${(month.sent / maxMonthlyValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    ผู้รับ PO สูงสุด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.topRecipients.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">ไม่มีข้อมูล</p>
                    ) : (
                      data.topRecipients.map((recipient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{recipient.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.count} รายการ
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold">{formatCurrency(recipient.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  PO ที่ส่งล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground">ไฟล์</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">ส่งถึง</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">ยอดรวม</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">วันที่ส่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentActivity.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center p-8 text-muted-foreground">
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        data.recentActivity.map((activity, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate max-w-[200px]">
                                  {activity.fileName}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{activity.sentTo}</td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(activity.total)}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {new Date(activity.sentAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}

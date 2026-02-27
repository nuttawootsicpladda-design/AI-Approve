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
  RefreshCw,
  Bell,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NavBar } from '@/components/NavBar'
import { formatCurrency } from '@/lib/utils'
import { UserRole, ApprovalStatus } from '@/lib/types'

interface StatusTrackingItem {
  id: string
  fileName: string
  sentTo: string
  createdBy: string
  total: number
  sentAt: string
  approvalStatus: ApprovalStatus
  currentApprovalLevel: number
  maxApprovalLevel: number
  approvedAt: string | null
  rejectedAt: string | null
  approvalComment: string | null
}

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
  statusTracking: StatusTrackingItem[]
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

// Status badge component
function StatusBadge({ status, currentLevel, maxLevel }: { status: ApprovalStatus; currentLevel: number; maxLevel: number }) {
  const isMultiLevel = maxLevel > 1

  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-icp-success-light text-icp-success">
        <CheckCircle className="h-3 w-3" />
        อนุมัติแล้ว
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-icp-danger-light text-icp-danger">
        <XCircle className="h-3 w-3" />
        ไม่อนุมัติ
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-icp-warning-light text-icp-warning-dark">
      <Clock className="h-3 w-3" />
      รอ{isMultiLevel ? ` (${currentLevel}/${maxLevel})` : 'อนุมัติ'}
    </span>
  )
}

// Level progress dots
function LevelProgress({ current, max, status }: { current: number; max: number; status: ApprovalStatus }) {
  if (max <= 1) return null
  return (
    <div className="flex items-center gap-1 mt-1">
      {Array.from({ length: max }, (_, i) => {
        const level = i + 1
        const isApproved = status === 'approved' ? true : level < current
        const isCurrent = level === current && status === 'pending'
        const isRejected = level === current && status === 'rejected'

        let cls = 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold '
        if (isApproved && (status === 'approved' || level < current)) {
          cls += 'bg-icp-success text-white'
        } else if (isCurrent) {
          cls += 'bg-icp-warning text-white'
        } else if (isRejected) {
          cls += 'bg-icp-danger text-white'
        } else {
          cls += 'bg-gray-200 text-gray-500'
        }

        return (
          <div key={level} className="flex items-center gap-0.5">
            <div className={cls}>
              {isApproved && (status === 'approved' || level < current) ? (
                <CheckCircle className="h-3 w-3" />
              ) : isRejected ? (
                <XCircle className="h-3 w-3" />
              ) : (
                level
              )}
            </div>
            {level < max && <span className="text-gray-300 text-[10px]">&rarr;</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLineNotify, setShowLineNotify] = useState(false)
  const [lineToken, setLineToken] = useState('')
  const [isSavingToken, setIsSavingToken] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('employee')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

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

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/dashboard/pending')
      const result = await response.json()
      if (result.success) {
        setPendingCount(result.data.length)
      }
    } catch {}
  }

  useEffect(() => {
    try {
      const userInfoCookie = document.cookie.split('; ').find(c => c.startsWith('user-info='))
      if (userInfoCookie) {
        const info = JSON.parse(decodeURIComponent(userInfoCookie.split('=')[1]))
        setUserName(info.name || info.email || '')
        setUserRole(info.role || 'employee')
      }
    } catch {}
    fetchDashboard()
    fetchPendingCount()
    const savedToken = localStorage.getItem('line-notify-token')
    if (savedToken) {
      setLineToken(savedToken)
    }
  }, [])

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

  // Filter status tracking
  const filteredTracking = data?.statusTracking?.filter(item => {
    if (statusFilter === 'all') return true
    return item.approvalStatus === statusFilter
  }) || []

  // Count by status
  const statusCounts = {
    all: data?.statusTracking?.length || 0,
    pending: data?.statusTracking?.filter(i => i.approvalStatus === 'pending').length || 0,
    approved: data?.statusTracking?.filter(i => i.approvalStatus === 'approved').length || 0,
    rejected: data?.statusTracking?.filter(i => i.approvalStatus === 'rejected').length || 0,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <NavBar
          activePage="dashboard"
          userRole={userRole}
          userName={userName}
          onLogout={handleLogout}
          rightContent={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLineNotify(!showLineNotify)}
                className="gap-1.5"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden md:inline">Line Notify</span>
              </Button>
              <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          }
        />

        {/* Line Notify Config */}
        {showLineNotify && (
          <Card className="border-2 border-icp-success/30 bg-icp-success-light">
            <CardHeader>
              <CardTitle className="text-icp-success flex items-center gap-2">
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
                    className="text-icp-primary underline"
                  >
                    notify-bot.line.me/my
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveLineToken} disabled={isSavingToken} className="bg-icp-success hover:bg-icp-success-dark">
                  {isSavingToken ? 'กำลังบันทึก...' : 'บันทึก Token'}
                </Button>
                <Button variant="outline" onClick={testLineNotify}>
                  ทดสอบส่งข้อความ
                </Button>
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
              <Card className="bg-gradient-to-br from-icp-primary to-icp-primary-dark text-white">
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

              <Card className="bg-gradient-to-br from-icp-success to-icp-success-dark text-white">
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

              <Card className="bg-gradient-to-br from-icp-cyan to-icp-cyan-dark text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">เดือนนี้</p>
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
                    <Calendar className="h-10 w-10 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-icp-warning to-icp-warning-dark text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm">ยอดเดือนนี้</p>
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
                    <TrendingUp className="h-10 w-10 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PO Status Tracking Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    สถานะ PO ทั้งหมด
                  </CardTitle>
                  {/* Filter Tabs */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
                    {([
                      { key: 'all', label: 'ทั้งหมด', icon: null },
                      { key: 'pending', label: 'รออนุมัติ', icon: <Clock className="h-3 w-3" /> },
                      { key: 'approved', label: 'อนุมัติ', icon: <CheckCircle className="h-3 w-3" /> },
                      { key: 'rejected', label: 'ไม่อนุมัติ', icon: <XCircle className="h-3 w-3" /> },
                    ] as { key: StatusFilter; label: string; icon: React.ReactNode }[]).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`
                          flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                          ${statusFilter === tab.key
                            ? 'bg-white shadow-sm text-icp-primary'
                            : 'text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        {tab.icon}
                        {tab.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          statusFilter === tab.key ? 'bg-icp-primary/10 text-icp-primary' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {statusCounts[tab.key]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground text-sm">ไฟล์</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-sm">ส่งถึง</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-sm">ผู้ส่ง</th>
                        <th className="text-right p-3 font-medium text-muted-foreground text-sm">ยอดรวม</th>
                        <th className="text-center p-3 font-medium text-muted-foreground text-sm">สถานะ</th>
                        <th className="text-center p-3 font-medium text-muted-foreground text-sm">Level</th>
                        <th className="text-right p-3 font-medium text-muted-foreground text-sm">วันที่ส่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTracking.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        filteredTracking.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm truncate max-w-[180px]">
                                  {item.fileName}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground truncate max-w-[150px]">
                              {item.sentTo}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground truncate max-w-[150px]">
                              {item.createdBy}
                            </td>
                            <td className="p-3 text-right font-semibold text-sm">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge
                                status={item.approvalStatus}
                                currentLevel={item.currentApprovalLevel}
                                maxLevel={item.maxApprovalLevel}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center">
                                {item.maxApprovalLevel > 1 ? (
                                  <LevelProgress
                                    current={item.currentApprovalLevel}
                                    max={item.maxApprovalLevel}
                                    status={item.approvalStatus}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(item.sentAt).toLocaleDateString('th-TH', {
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
                            className="h-full bg-gradient-to-r from-icp-primary to-icp-primary-200 rounded-full transition-all duration-500"
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
                            <div className="w-8 h-8 bg-icp-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-icp-primary">
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
          </>
        ) : null}
      </div>
    </div>
  )
}

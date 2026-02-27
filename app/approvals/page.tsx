'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Layers,
  DollarSign,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NavBar } from '@/components/NavBar'
import { formatCurrency } from '@/lib/utils'
import { POItem, UserRole } from '@/lib/types'

interface PendingRecord {
  id: string
  stepId?: string
  level?: number
  approverEmail?: string
  fileName: string
  sentTo: string
  sentFrom: string
  total: number
  sentAt: string
  createdBy?: string
  items: POItem[]
  currentApprovalLevel?: number
  maxApprovalLevel?: number
}

export default function ApprovalsPage() {
  const router = useRouter()
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [showCommentFor, setShowCommentFor] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('employee')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const fetchPending = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/pending')
      const result = await response.json()
      if (result.success) {
        setPendingRecords(result.data)
      }
    } catch {
      console.error('Failed to fetch pending records')
    } finally {
      setIsLoading(false)
    }
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
    fetchPending()
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
        setExpandedId(null)

        if (action === 'approve') {
          if (result.data?.isFinalized) {
            setSuccessMsg(`อนุมัติ PO เรียบร้อยแล้ว (Final)`)
          } else if (result.data?.nextLevelName) {
            setSuccessMsg(`อนุมัติแล้ว! ส่งต่อให้ ${result.data.nextLevelName} (Level ${result.data.nextLevel})`)
          } else {
            setSuccessMsg('อนุมัติเรียบร้อยแล้ว')
          }
        } else {
          setSuccessMsg('ปฏิเสธ PO เรียบร้อยแล้ว')
        }
        setTimeout(() => setSuccessMsg(null), 5000)
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

  const getApproveLabel = (record: PendingRecord) => {
    const maxLevel = record.maxApprovalLevel || 1
    const currentLevel = record.currentApprovalLevel || record.level || 1
    if (maxLevel > 1 && currentLevel < maxLevel) {
      return `อนุมัติ & ส่งต่อ Level ${currentLevel + 1}`
    }
    if (maxLevel > 1 && currentLevel >= maxLevel) {
      return 'อนุมัติ (Final)'
    }
    return 'อนุมัติ'
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    if (showCommentFor?.id !== id) {
      setShowCommentFor(null)
      setApprovalComment('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <NavBar
          activePage="approvals"
          userRole={userRole}
          userName={userName}
          onLogout={handleLogout}
          rightContent={
            <div className="flex items-center gap-2">
              {pendingRecords.length > 0 && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold text-white bg-icp-danger rounded-full">
                  {pendingRecords.length} รอ
                </span>
              )}
              <Button variant="outline" size="sm" onClick={fetchPending} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          }
        />

        {/* Success Message */}
        {successMsg && (
          <Card className="border-icp-success bg-icp-success-light">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="h-5 w-5 text-icp-success flex-shrink-0" />
              <p className="text-sm text-icp-success font-medium">{successMsg}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">กำลังโหลดรายการ...</p>
            </CardContent>
          </Card>
        ) : pendingRecords.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-16">
              <Inbox className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">ไม่มีรายการรอการอนุมัติ</h3>
              <p className="text-sm text-muted-foreground">PO ที่ถูกส่งมาให้คุณอนุมัติจะแสดงที่นี่</p>
            </CardContent>
          </Card>
        ) : (
          /* Pending Records List */
          <div className="space-y-4">
            {pendingRecords.map(record => {
              const maxLevel = record.maxApprovalLevel || 1
              const currentLevel = record.currentApprovalLevel || record.level || 1
              const isMultiLevel = maxLevel > 1
              const isExpanded = expandedId === record.id
              const total = Number(record.total) || 0

              return (
                <Card key={record.id} className="overflow-hidden">
                  {/* Main Row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* File name + Level badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-icp-primary flex-shrink-0" />
                          <span className="font-semibold truncate">{record.fileName}</span>
                          {isMultiLevel && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-icp-primary-light text-icp-primary rounded-full text-xs font-semibold flex-shrink-0">
                              <Layers className="h-3 w-3" />
                              Level {currentLevel}/{maxLevel}
                            </span>
                          )}
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            <span>{record.createdBy || record.sentFrom}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span className="text-icp-success font-bold">{formatCurrency(total)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(record.sentAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: buttons or expand icon */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isExpanded && processingId !== record.id && (
                          <>
                            <Button
                              size="sm"
                              className="bg-icp-success hover:bg-icp-success-dark"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(record.id)
                                openCommentDialog(record.id, 'approve')
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {getApproveLabel(record)}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-icp-danger hover:bg-icp-danger/90 text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedId(record.id)
                                openCommentDialog(record.id, 'reject')
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ไม่อนุมัติ
                            </Button>
                          </>
                        )}
                        {processingId === record.id && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20">
                      {/* Items Table */}
                      {record.items && record.items.length > 0 && (
                        <div className="p-4 pb-0">
                          <h4 className="text-sm font-semibold mb-2">รายการสินค้า</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-icp-primary text-white">
                                  <th className="border border-icp-primary-dark p-2 text-left w-10">No.</th>
                                  <th className="border border-icp-primary-dark p-2 text-left">ชื่อสินค้า</th>
                                  <th className="border border-icp-primary-dark p-2 text-right w-20">จำนวน</th>
                                  <th className="border border-icp-primary-dark p-2 text-right w-24">ราคา</th>
                                  <th className="border border-icp-primary-dark p-2 text-left w-28">PO No.</th>
                                  <th className="border border-icp-primary-dark p-2 text-right w-28">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-muted/50">
                                    <td className="border border-border p-2 text-center">{idx + 1}</td>
                                    <td className="border border-border p-2">{item.name}</td>
                                    <td className="border border-border p-2 text-right">
                                      {Number(item.quantity).toLocaleString()}
                                    </td>
                                    <td className="border border-border p-2 text-right">
                                      {formatCurrency(Number(item.cost))}
                                    </td>
                                    <td className="border border-border p-2">{item.poNo}</td>
                                    <td className="border border-border p-2 text-right font-semibold">
                                      {formatCurrency(Number(item.usd))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-muted font-bold">
                                  <td colSpan={5} className="border border-border p-2 text-right">รวม</td>
                                  <td className="border border-border p-2 text-right">
                                    {formatCurrency(total)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Comment + Action Area */}
                      <div className="p-4">
                        {showCommentFor?.id === record.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium block mb-1">
                                {showCommentFor.action === 'reject'
                                  ? 'เหตุผลที่ไม่อนุมัติ'
                                  : 'หมายเหตุ (ไม่บังคับ)'}
                              </label>
                              <textarea
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                placeholder={showCommentFor.action === 'reject'
                                  ? 'กรุณาระบุเหตุผลที่ไม่อนุมัติ...'
                                  : 'ใส่หมายเหตุเพิ่มเติม...'}
                                className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-icp-primary focus:border-icp-primary"
                                rows={3}
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                className={showCommentFor.action === 'approve' ? 'bg-icp-success hover:bg-icp-success-dark' : 'bg-icp-danger hover:bg-icp-danger/90'}
                                onClick={() => handleApprovalAction(record.id, showCommentFor.action)}
                                disabled={processingId === record.id}
                              >
                                {processingId === record.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : showCommentFor.action === 'approve' ? (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                {showCommentFor.action === 'approve'
                                  ? `ยืนยัน${getApproveLabel(record)}`
                                  : 'ยืนยันไม่อนุมัติ'}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowCommentFor(null)
                                  setApprovalComment('')
                                }}
                              >
                                ยกเลิก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <Button
                              className="bg-icp-success hover:bg-icp-success-dark"
                              onClick={() => openCommentDialog(record.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {getApproveLabel(record)}
                            </Button>
                            <Button
                              className="bg-icp-danger hover:bg-icp-danger/90 text-white"
                              onClick={() => openCommentDialog(record.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              ไม่อนุมัติ
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

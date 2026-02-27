'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  Mail,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PORecord } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

// Approval status badge component
function ApprovalBadge({ status }: { status?: string }) {
  if (!status || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3" />
        รอการอนุมัติ
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        อนุมัติแล้ว
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="h-3 w-3" />
        ไม่อนุมัติ
      </span>
    )
  }
  return null
}

export default function HistoryPage() {
  const [records, setRecords] = useState<PORecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<PORecord | null>(null)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/history')
      const result = await response.json()
      if (result.success) {
        setRecords(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return
    }

    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        setRecords(records.filter((r) => r.id !== id))
        if (selectedRecord?.id === id) {
          setSelectedRecord(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete record:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PO History</h1>
            <p className="text-sm text-gray-600 mt-1">View all sent purchase orders</p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="text-center p-12">
              <p className="text-muted-foreground">No records found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Records List */}
            <div className="lg:col-span-1 space-y-4">
              {records.map((record) => (
                <Card
                  key={record.id}
                  className={`cursor-pointer transition-all ${
                    selectedRecord?.id === record.id
                      ? 'ring-2 ring-primary shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{record.fileName}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(record.sentAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(record.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{record.sentTo}</span>
                        </div>
                      </div>
                      {/* Approval Status Badge */}
                      <div className="pt-1">
                        <ApprovalBadge status={record.approvalStatus} />
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-sm">
                          {formatCurrency(record.total)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {record.items.length} items
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Record Details */}
            <div className="lg:col-span-2">
              {selectedRecord ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Record Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">File Name</p>
                          <p className="font-medium">{selectedRecord.fileName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Sent To</p>
                          <p className="font-medium">{selectedRecord.sentTo}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Date Sent</p>
                          <p className="font-medium">
                            {format(new Date(selectedRecord.sentAt), 'MMMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Total Amount</p>
                          <p className="font-bold text-lg text-green-600">
                            {formatCurrency(selectedRecord.total)}
                          </p>
                        </div>
                        {selectedRecord.createdBy && (
                          <div>
                            <p className="text-muted-foreground mb-1">Created By</p>
                            <p className="font-medium">{selectedRecord.createdBy}</p>
                          </div>
                        )}
                      </div>

                      {/* Approval Status */}
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Approval Status</span>
                          <ApprovalBadge status={selectedRecord.approvalStatus} />
                        </div>
                        {selectedRecord.approvedAt && (
                          <p className="text-sm text-muted-foreground">
                            อนุมัติเมื่อ: {format(new Date(selectedRecord.approvedAt), 'MMMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {selectedRecord.rejectedAt && (
                          <p className="text-sm text-muted-foreground">
                            ปฏิเสธเมื่อ: {format(new Date(selectedRecord.rejectedAt), 'MMMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {selectedRecord.approvalComment && (
                          <p className="text-sm mt-2">
                            <span className="font-medium">หมายเหตุ:</span> {selectedRecord.approvalComment}
                          </p>
                        )}
                      </div>

                      {/* Items Table */}
                      <div>
                        <h3 className="font-semibold mb-3">Items</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border border-border p-2 text-left">No.</th>
                                <th className="border border-border p-2 text-left">Name</th>
                                <th className="border border-border p-2 text-right">Quantity</th>
                                <th className="border border-border p-2 text-right">Cost</th>
                                <th className="border border-border p-2 text-left">P/O No.</th>
                                <th className="border border-border p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRecord.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="border border-border p-2 text-center">
                                    {index + 1}
                                  </td>
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
                                <td colSpan={5} className="border border-border p-2 text-right">
                                  Total
                                </td>
                                <td className="border border-border p-2 text-right">
                                  {formatCurrency(selectedRecord.total)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center p-12">
                    <div className="text-center">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select a record to view details
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

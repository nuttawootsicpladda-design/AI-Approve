import { NextResponse } from 'next/server'
import { getAllRecords } from '@/lib/db'

export async function GET() {
  try {
    const records = await getAllRecords()
    console.log('Dashboard: Total records fetched:', records.length)

    // Calculate stats
    const totalPOs = records.length
    const pendingCount = records.filter(r => r.approvalStatus === 'pending').length

    // Calculate total amount (ensure number type)
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.total) || 0), 0)

    // Monthly data for chart (last 6 months)
    const monthlyData: { month: string; sent: number; amount: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })

      const monthRecords = records.filter(r => {
        const recordDate = new Date(r.sentAt)
        return recordDate.getFullYear() === date.getFullYear() &&
               recordDate.getMonth() === date.getMonth()
      })

      monthlyData.push({
        month: monthName,
        sent: monthRecords.length,
        amount: monthRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
      })
    }

    // Top recipients
    const recipientMap = new Map<string, { count: number; amount: number }>()
    records.forEach(r => {
      const existing = recipientMap.get(r.sentTo) || { count: 0, amount: 0 }
      recipientMap.set(r.sentTo, {
        count: existing.count + 1,
        amount: existing.amount + (Number(r.total) || 0),
      })
    })
    const topRecipients = Array.from(recipientMap.entries())
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Recent activity
    const recentActivity = records
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        fileName: r.fileName,
        sentTo: r.sentTo,
        total: Number(r.total) || 0,
        sentAt: r.sentAt,
      }))

    // Status tracking - all POs with approval status
    const statusTracking = records
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        fileName: r.fileName,
        sentTo: r.sentTo,
        createdBy: r.createdBy || r.sentFrom || '-',
        total: Number(r.total) || 0,
        sentAt: r.sentAt,
        approvalStatus: r.approvalStatus || 'pending',
        currentApprovalLevel: r.currentApprovalLevel || 1,
        maxApprovalLevel: r.maxApprovalLevel || 1,
        approvedAt: r.approvedAt || null,
        rejectedAt: r.rejectedAt || null,
        approvalComment: r.approvalComment || null,
      }))

    // This month stats
    const thisMonth = new Date()
    const thisMonthRecords = records.filter(r => {
      const recordDate = new Date(r.sentAt)
      return recordDate.getFullYear() === thisMonth.getFullYear() &&
             recordDate.getMonth() === thisMonth.getMonth()
    })
    const thisMonthCount = thisMonthRecords.length
    const thisMonthAmount = thisMonthRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0)

    // Last month for comparison
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1)
    const lastMonthRecords = records.filter(r => {
      const recordDate = new Date(r.sentAt)
      return recordDate.getFullYear() === lastMonth.getFullYear() &&
             recordDate.getMonth() === lastMonth.getMonth()
    })
    const lastMonthCount = lastMonthRecords.length
    const lastMonthAmount = lastMonthRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0)

    // Calculate growth
    const countGrowth = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : thisMonthCount > 0 ? 100 : 0
    const amountGrowth = lastMonthAmount > 0
      ? Math.round(((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100)
      : thisMonthAmount > 0 ? 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPOs,
          pendingCount,
          totalAmount,
          thisMonthCount,
          thisMonthAmount,
          countGrowth,
          amountGrowth,
        },
        monthlyData,
        topRecipients,
        recentActivity,
        statusTracking,
      },
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load dashboard data' },
      { status: 500 }
    )
  }
}

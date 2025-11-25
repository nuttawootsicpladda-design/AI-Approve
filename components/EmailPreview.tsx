'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { formatCurrency } from '@/lib/utils'
import { POItem } from '@/lib/types'

interface EmailPreviewProps {
  to: string
  subject: string
  items: POItem[]
  onToChange: (value: string) => void
  onSubjectChange: (value: string) => void
  translations: {
    recipient: string
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
  to,
  subject,
  items,
  onToChange,
  onSubjectChange,
  translations,
}: EmailPreviewProps) {
  const total = items.reduce((sum, item) => {
    const usd = typeof item.usd === 'number' ? item.usd : parseFloat(String(item.usd) || '0')
    return sum + (isNaN(usd) ? 0 : usd)
  }, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">{translations.recipient}</label>
          <Input value={to} onChange={(e) => onToChange(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            {translations.subject_label}
          </label>
          <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} />
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <div className="space-y-3 text-sm">
            <p>{translations.greeting}</p>
            <p>{translations.body}</p>
            <div className="mt-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">
                      {translations.table.no}
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      {translations.table.name}
                    </th>
                    <th className="border border-gray-300 p-2 text-right">
                      {translations.table.quantity}
                    </th>
                    <th className="border border-gray-300 p-2 text-right">
                      {translations.table.cost}
                    </th>
                    <th className="border border-gray-300 p-2 text-left">
                      {translations.table.poNo}
                    </th>
                    <th className="border border-gray-300 p-2 text-right">
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

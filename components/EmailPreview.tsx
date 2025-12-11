'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { formatCurrency } from '@/lib/utils'
import { POItem } from '@/lib/types'
import { ChevronDown, X } from 'lucide-react'

// Predefined email list
const EMAIL_LIST = [
  'pitchaya.n@icpladda.com',
  'raekha.s@icpladda.com',
  'kanyapak.d@icpladda.com',
  'muksuda.w@icpladda.com',
  'jatuporn.n@icpladda.com',
]

interface EmailPreviewProps {
  to: string
  cc?: string
  subject: string
  items: POItem[]
  onToChange: (value: string) => void
  onCcChange?: (value: string) => void
  onSubjectChange: (value: string) => void
  translations: {
    recipient: string
    cc?: string
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
  cc,
  subject,
  items,
  onToChange,
  onCcChange,
  onSubjectChange,
  translations,
}: EmailPreviewProps) {
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [showCcDropdown, setShowCcDropdown] = useState(false)

  const total = items.reduce((sum, item) => {
    const usd = typeof item.usd === 'number' ? item.usd : parseFloat(String(item.usd) || '0')
    return sum + (isNaN(usd) ? 0 : usd)
  }, 0)

  // Parse CC emails into array
  const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(e => e) : []

  const addCcEmail = (email: string) => {
    if (!ccEmails.includes(email)) {
      const newCc = [...ccEmails, email].join(', ')
      onCcChange?.(newCc)
    }
    setShowCcDropdown(false)
  }

  const removeCcEmail = (email: string) => {
    const newCc = ccEmails.filter(e => e !== email).join(', ')
    onCcChange?.(newCc)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* To Field with Dropdown */}
        <div className="relative">
          <label className="text-sm font-medium mb-1.5 block">{translations.recipient}</label>
          <div className="flex gap-2">
            <Input value={to} onChange={(e) => onToChange(e.target.value)} className="flex-1" />
            <button
              type="button"
              onClick={() => setShowToDropdown(!showToDropdown)}
              className="px-3 py-2 border rounded-md hover:bg-gray-100 flex items-center gap-1"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {showToDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {EMAIL_LIST.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    onToChange(email)
                    setShowToDropdown(false)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                >
                  {email}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CC Field with Dropdown and Tags */}
        <div className="relative">
          <label className="text-sm font-medium mb-1.5 block">{translations.cc || 'CC'}</label>
          <div className="flex gap-2">
            <div className="flex-1 border rounded-md p-2 min-h-[40px] flex flex-wrap gap-1 items-center">
              {ccEmails.map((email) => (
                <span
                  key={email}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeCcEmail(email)}
                    className="hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={ccEmails.length === 0 ? 'เพิ่ม CC...' : ''}
                className="flex-1 min-w-[100px] outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    addCcEmail(e.currentTarget.value)
                    e.currentTarget.value = ''
                    e.preventDefault()
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCcDropdown(!showCcDropdown)}
              className="px-3 py-2 border rounded-md hover:bg-gray-100 flex items-center gap-1"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {showCcDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {EMAIL_LIST.filter(e => !ccEmails.includes(e)).map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => addCcEmail(email)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                >
                  {email}
                </button>
              ))}
            </div>
          )}
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
                  <tr className="bg-green-600 text-white">
                    <th className="border border-green-700 p-2 text-left">
                      {translations.table.no}
                    </th>
                    <th className="border border-green-700 p-2 text-left">
                      {translations.table.name}
                    </th>
                    <th className="border border-green-700 p-2 text-right">
                      {translations.table.quantity}
                    </th>
                    <th className="border border-green-700 p-2 text-right">
                      {translations.table.cost}
                    </th>
                    <th className="border border-green-700 p-2 text-left">
                      {translations.table.poNo}
                    </th>
                    <th className="border border-green-700 p-2 text-right">
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

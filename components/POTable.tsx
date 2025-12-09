'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { POItem } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface POTableProps {
  items: POItem[]
  onChange: (items: POItem[]) => void
  editable?: boolean
  translations: {
    no: string
    name: string
    quantity: string
    cost: string
    poNo: string
    usd: string
    total: string
    edit: string
    delete: string
    save: string
    cancel: string
    addRow: string
  }
}

export function POTable({ items, onChange, editable = true, translations }: POTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<POItem | null>(null)

  const total = items.reduce((sum, item) => {
    const usd = typeof item.usd === 'number' ? item.usd : parseFloat(String(item.usd) || '0')
    return sum + (isNaN(usd) ? 0 : usd)
  }, 0)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditData({ ...items[index] })
  }

  const handleSave = () => {
    if (editingIndex !== null && editData) {
      const newItems = [...items]
      newItems[editingIndex] = editData
      onChange(newItems)
      setEditingIndex(null)
      setEditData(null)
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditData(null)
  }

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  const handleAddRow = () => {
    const newItem: POItem = {
      no: items.length + 1,
      name: '',
      quantity: 0,
      cost: 0,
      poNo: '',
      usd: 0,
    }
    onChange([...items, newItem])
  }

  const updateEditData = (field: keyof POItem, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="border border-green-700 p-3 text-left font-semibold text-sm">
                  {translations.no}
                </th>
                <th className="border border-green-700 p-3 text-left font-semibold text-sm">
                  {translations.name}
                </th>
                <th className="border border-green-700 p-3 text-right font-semibold text-sm">
                  {translations.quantity}
                </th>
                <th className="border border-green-700 p-3 text-right font-semibold text-sm">
                  {translations.cost}
                </th>
                <th className="border border-green-700 p-3 text-left font-semibold text-sm">
                  {translations.poNo}
                </th>
                <th className="border border-green-700 p-3 text-right font-semibold text-sm">
                  {translations.usd}
                </th>
                {editable && (
                  <th className="border border-green-700 p-3 text-center font-semibold text-sm w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const isEditing = editingIndex === index
                const displayItem = isEditing && editData ? editData : item

                return (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="border border-border p-3 text-center text-sm">
                      {index + 1}
                    </td>
                    <td className="border border-border p-3 text-sm">
                      {isEditing ? (
                        <Input
                          value={displayItem.name}
                          onChange={(e) => updateEditData('name', e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        displayItem.name
                      )}
                    </td>
                    <td className="border border-border p-3 text-right text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={displayItem.quantity}
                          onChange={(e) => updateEditData('quantity', parseFloat(e.target.value))}
                          className="h-8 text-right"
                        />
                      ) : (
                        formatNumber(Number(displayItem.quantity))
                      )}
                    </td>
                    <td className="border border-border p-3 text-right text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={displayItem.cost}
                          onChange={(e) => updateEditData('cost', parseFloat(e.target.value))}
                          className="h-8 text-right"
                        />
                      ) : (
                        formatCurrency(Number(displayItem.cost))
                      )}
                    </td>
                    <td className="border border-border p-3 text-sm">
                      {isEditing ? (
                        <Input
                          value={displayItem.poNo}
                          onChange={(e) => updateEditData('poNo', e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        displayItem.poNo
                      )}
                    </td>
                    <td className="border border-border p-3 text-right text-sm font-semibold">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={displayItem.usd}
                          onChange={(e) => updateEditData('usd', parseFloat(e.target.value))}
                          className="h-8 text-right"
                        />
                      ) : (
                        formatCurrency(Number(displayItem.usd))
                      )}
                    </td>
                    {editable && (
                      <td className="border border-border p-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSave}
                              className="h-8 w-8"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancel}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-semibold">
                <td colSpan={5} className="border border-border p-3 text-right text-sm">
                  {translations.total}
                </td>
                <td className="border border-border p-3 text-right text-sm">
                  {formatCurrency(total)}
                </td>
                {editable && <td className="border border-border"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {editable && (
        <Button onClick={handleAddRow} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {translations.addRow}
        </Button>
      )}
    </div>
  )
}

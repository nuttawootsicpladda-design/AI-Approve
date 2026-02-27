'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trash2,
  Loader2,
  UserPlus,
  Users,
  Layers,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NavBar } from '@/components/NavBar'
import { User, UserRole, ApprovalLevelConfig } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  employee: 'bg-gray-100 text-gray-800',
  manager: 'bg-icp-primary-light text-icp-primary',
  admin: 'bg-icp-cyan-light text-icp-cyan-dark',
}

interface LevelForm {
  level: number
  levelName: string
  maxAmount: string
  approverEmail: string
  isActive: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('employee')

  // New user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('employee')
  const [isAdding, setIsAdding] = useState(false)

  // Approval levels state
  const [levels, setLevels] = useState<ApprovalLevelConfig[]>([])
  const [levelsLoading, setLevelsLoading] = useState(true)
  const [levelForms, setLevelForms] = useState<LevelForm[]>([])
  const [savingLevel, setSavingLevel] = useState<number | null>(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
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
    fetchUsers()
    fetchLevels()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      if (result.success) {
        setUsers(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLevels = async () => {
    setLevelsLoading(true)
    try {
      const response = await fetch('/api/admin/approval-levels')
      const result = await response.json()
      if (result.success) {
        setLevels(result.data)
        // Initialize forms from existing data
        const forms: LevelForm[] = [1, 2, 3].map(level => {
          const existing = (result.data as ApprovalLevelConfig[]).find(l => l.level === level)
          return existing
            ? {
                level: existing.level,
                levelName: existing.levelName,
                maxAmount: existing.maxAmount !== null ? String(existing.maxAmount) : '',
                approverEmail: existing.approverEmail,
                isActive: existing.isActive,
              }
            : {
                level,
                levelName: level === 1 ? 'Manager' : level === 2 ? 'Director' : 'VP',
                maxAmount: '',
                approverEmail: '',
                isActive: false,
              }
        })
        setLevelForms(forms)
      }
    } catch {
      console.error('Failed to fetch approval levels')
    } finally {
      setLevelsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
      })
      const result = await response.json()

      if (result.success) {
        setUsers([result.data, ...users])
        setNewEmail('')
        setNewName('')
        setNewRole('employee')
        setSuccess('User added successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to add user')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    setError(null)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      })
      const result = await response.json()

      if (result.success) {
        setUsers(users.map(u => u.id === id ? { ...u, role } : u))
        setSuccess('Role updated successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to update role')
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`ลบผู้ใช้ ${email} ?`)) return

    setError(null)
    try {
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        setUsers(users.filter(u => u.id !== id))
        setSuccess('User deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to delete user')
    }
  }

  const updateLevelForm = (index: number, field: keyof LevelForm, value: string | boolean) => {
    setLevelForms(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSaveLevel = async (index: number) => {
    const form = levelForms[index]
    if (!form.approverEmail.trim()) {
      setError('กรุณาใส่ email ผู้อนุมัติ')
      return
    }
    if (!form.levelName.trim()) {
      setError('กรุณาใส่ชื่อ Level')
      return
    }

    setSavingLevel(form.level)
    setError(null)

    try {
      const response = await fetch('/api/admin/approval-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: form.level,
          levelName: form.levelName,
          maxAmount: form.maxAmount.trim() !== '' ? Number(form.maxAmount) : null,
          approverEmail: form.approverEmail,
          isActive: form.isActive,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setSuccess(`Level ${form.level} saved successfully`)
        setTimeout(() => setSuccess(null), 3000)
        fetchLevels()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to save level')
    } finally {
      setSavingLevel(null)
    }
  }

  const handleDeleteLevel = async (level: number) => {
    const existing = levels.find(l => l.level === level)
    if (!existing) return
    if (!confirm(`ลบ Level ${level} (${existing.levelName})?`)) return

    setError(null)
    try {
      const response = await fetch(`/api/admin/approval-levels?id=${existing.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        setSuccess(`Level ${level} deleted`)
        setTimeout(() => setSuccess(null), 3000)
        fetchLevels()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to delete level')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-icp-primary-light to-icp-primary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <NavBar
          activePage="admin"
          userRole={userRole}
          userName={userName}
          onLogout={handleLogout}
        />

        {/* Messages */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}
        {success && (
          <Card className="mb-6 border-icp-success bg-icp-success-light">
            <CardContent className="p-4 text-sm text-icp-success">{success}</CardContent>
          </Card>
        )}

        {/* Approval Level Config */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-icp-primary" />
              ตั้งค่าระดับการอนุมัติ (Approval Levels)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              กำหนดลำดับขั้นการอนุมัติตามมูลค่า PO (สูงสุด 3 ระดับ)
            </p>
          </CardHeader>
          <CardContent>
            {levelsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {levelForms.map((form, index) => {
                  const existingConfig = levels.find(l => l.level === form.level)
                  return (
                    <div
                      key={form.level}
                      className={`border rounded-lg p-4 ${
                        form.isActive
                          ? 'border-icp-primary-200 bg-icp-primary-light/50'
                          : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            form.isActive
                              ? 'bg-icp-primary text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {form.level}
                          </span>
                          <span className="font-semibold">Level {form.level}</span>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.isActive}
                              onChange={(e) => updateLevelForm(index, 'isActive', e.target.checked)}
                              className="rounded"
                            />
                            Active
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveLevel(index)}
                            disabled={savingLevel === form.level}
                            className="bg-icp-primary hover:bg-icp-primary-dark"
                          >
                            {savingLevel === form.level ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                บันทึก
                              </>
                            )}
                          </Button>
                          {existingConfig && (
                            <Button
                              size="sm"
                              className="bg-icp-danger hover:bg-icp-danger/90 text-white"
                              onClick={() => handleDeleteLevel(form.level)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            ชื่อ Level
                          </label>
                          <Input
                            value={form.levelName}
                            onChange={(e) => updateLevelForm(index, 'levelName', e.target.value)}
                            placeholder="เช่น Manager, Director, VP"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            มูลค่าสูงสุดที่อนุมัติได้ (USD)
                          </label>
                          <Input
                            type="number"
                            value={form.maxAmount}
                            onChange={(e) => updateLevelForm(index, 'maxAmount', e.target.value)}
                            placeholder="ว่าง = ไม่จำกัด"
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.maxAmount
                              ? `PO > $${Number(form.maxAmount).toLocaleString()} จะต้องผ่าน Level ถัดไป`
                              : 'ไม่จำกัด (Level สุดท้าย)'}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Email ผู้อนุมัติ
                          </label>
                          <Input
                            type="email"
                            value={form.approverEmail}
                            onChange={(e) => updateLevelForm(index, 'approverEmail', e.target.value)}
                            placeholder="approver@company.com"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Help text */}
                <div className="bg-icp-warning-light border border-icp-warning rounded-lg p-4 text-sm text-icp-warning-dark">
                  <p className="font-semibold mb-1">วิธีการทำงาน:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>PO มูลค่า ≤ Level 1 max → ต้องการอนุมัติแค่ Level 1</li>
                    <li>PO มูลค่า &gt; Level 1 max → ต้องผ่าน Level 1 แล้วส่งต่อ Level 2</li>
                    <li>PO มูลค่า &gt; Level 2 max → ต้องผ่านทั้ง 3 ระดับ</li>
                    <li>Level สุดท้ายควรปล่อยมูลค่าสูงสุดว่าง (ไม่จำกัด)</li>
                    <li>เปิด Active เฉพาะ Level ที่ต้องการใช้งาน</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add User Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              เพิ่มผู้ใช้ใหม่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@icpladda.com"
                  required
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ชื่อผู้ใช้"
                />
              </div>
              <div className="w-[140px]">
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 border rounded-md text-sm"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={isAdding} className="bg-icp-primary hover:bg-icp-primary-dark">
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    เพิ่ม
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              ผู้ใช้ทั้งหมด ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ไม่มีผู้ใช้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{user.email}</td>
                        <td className="p-3">{user.name || '-'}</td>
                        <td className="p-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${ROLE_COLORS[user.role]}`}
                          >
                            <option value="employee">{ROLE_LABELS.employee}</option>
                            <option value="manager">{ROLE_LABELS.manager}</option>
                            <option value="admin">{ROLE_LABELS.admin}</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleDelete(user.id, user.email)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

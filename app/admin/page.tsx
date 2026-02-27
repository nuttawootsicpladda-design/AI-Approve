'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trash2,
  Loader2,
  UserPlus,
  Shield,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { User, UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  employee: 'bg-gray-100 text-gray-800',
  manager: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New user form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('employee')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchUsers()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-600 mt-1">จัดการผู้ใช้และกำหนดสิทธิ์</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}
        {success && (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardContent className="p-4 text-sm text-green-700">{success}</CardContent>
          </Card>
        )}

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
              <Button type="submit" disabled={isAdding}>
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

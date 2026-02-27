'use client'

import Link from 'next/link'
import {
  Send,
  CheckCircle,
  BarChart3,
  History,
  Shield,
  LogOut,
  User,
} from 'lucide-react'
import { UserRole } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  key: string
  roles?: UserRole[]
}

interface NavBarProps {
  activePage: string
  userRole: UserRole
  userName: string
  onLogout: () => void
  rightContent?: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Send PO', href: '/', icon: <Send className="h-4 w-4" />, key: 'home', roles: ['employee', 'admin'] },
  { label: 'Approvals', href: '/approvals', icon: <CheckCircle className="h-4 w-4" />, key: 'approvals', roles: ['manager', 'admin'] },
  { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 className="h-4 w-4" />, key: 'dashboard', roles: ['manager', 'admin'] },
  { label: 'History', href: '/history', icon: <History className="h-4 w-4" />, key: 'history' },
  { label: 'Admin', href: '/admin', icon: <Shield className="h-4 w-4" />, key: 'admin', roles: ['admin'] },
]

export function NavBar({ activePage, userRole, userName, onLogout, rightContent }: NavBarProps) {
  const visibleItems = navItems.filter(
    item => !item.roles || item.roles.includes(userRole)
  )

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl shadow-sm px-3 py-2.5 mb-8 overflow-hidden">
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="https://i.ibb.co/4wdW4yvd/ICP-ladda-logo-01-Copy.png" alt="ICP Ladda" className="h-8 w-auto object-contain" />
          <div className="hidden lg:block">
            <h1 className="text-sm font-bold text-icp-black leading-tight">PO Approval</h1>
            <p className="text-[10px] text-icp-grey leading-tight">ICP Ladda Co., Ltd</p>
          </div>
        </Link>

        {/* Navigation Tabs - scrollable */}
        <nav className="flex items-center bg-gray-100/80 rounded-lg p-1 gap-0.5 min-w-0 overflow-x-auto scrollbar-hide">
          {visibleItems.map(item => {
            const isActive = item.key === activePage
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0
                  ${isActive
                    ? 'bg-icp-primary text-white shadow-md shadow-icp-primary/25'
                    : 'text-icp-grey hover:text-icp-black hover:bg-white/70'
                  }
                `}
              >
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {rightContent}
          {userName && (
            <div className="hidden xl:flex items-center gap-2 text-sm text-icp-grey">
              <div className="w-7 h-7 rounded-full bg-icp-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-icp-primary" />
              </div>
              <span className="max-w-[120px] truncate">{userName}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-icp-grey hover:text-icp-danger hover:bg-icp-danger-light transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

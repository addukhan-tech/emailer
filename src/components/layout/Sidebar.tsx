'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban, Users, Clock,
  BarChart2, Calendar, Settings, Mail, LogOut, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Follow-ups', href: '/followups', icon: Clock },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Schedule', href: '/schedule', icon: Calendar },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <aside className="w-56 min-w-56 h-screen flex flex-col bg-white border-r border-gray-100 sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">Emailer</p>
            <p className="text-[10px] text-gray-400 mt-0.5">by Reforgex</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-link', active && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-40" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-brand-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{userName || userEmail}</p>
            <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

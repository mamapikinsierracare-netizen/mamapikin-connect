'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth'
import LogoutButton from './LogoutButton'

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: {
    full_name?: string
  }
  role?: string
}

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  const navItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Register Patient', path: '/register', icon: '📝' },
    { name: 'Patients', path: '/patients', icon: '🔍' },
    { name: 'Offline Patients', path: '/offline-patients', icon: '📱' },
    { name: 'Sync Queue', path: '/sync', icon: '🔄' },
    { name: 'Scheduler', path: '/scheduler', icon: '📅' },
    { name: 'ANC Visit', path: '/anc', icon: '🤰' },
    { name: 'PNC Visit', path: '/pnc', icon: '👩‍👧' },
    { name: 'Delivery', path: '/delivery', icon: '👶' },
    { name: 'Laboratory', path: '/lab', icon: '🧪' },
    { name: 'Pharmacy', path: '/pharmacy', icon: '💊' },
    { name: 'Patient Portal', path: '/portal', icon: '👤' },
    { name: 'Emergency Access', path: '/verify-token', icon: '🚨' },
    { name: 'Emergency', path: '/emergency', icon: '🚨' },
    { name: 'Facilities', path: '/maps', icon: '📍' },
    { name: 'Health Guides', path: '/guides', icon: '📚' },
    { name: 'Analytics', path: '/analytics', icon: '📊' },
    { name: 'User Management', path: '/admin/users', icon: '👥' },
    { name: 'Immunisation', path: '/immunisation', icon: '💉' },
    { name: 'Referrals', path: '/referral', icon: '🔄' },
    { name: 'Referral Inbox', path: '/referral-inbox', icon: '📥' },
    { name: 'Blood Bank', path: '/blood-bank', icon: '🩸' },
    { name: 'SMS Queue', path: '/sms-queue', icon: '📱' },
    { name: 'DHIS2 Export', path: '/dhis2-export', icon: '📤' },
    { name: 'Request Facility', path: '/facility-request', icon: '🏥' },
{ name: 'Facility Requests (Admin)', path: '/admin/facility-requests', icon: '✅' },
  ]
  
  useEffect(() => {
    async function loadUser() {
      const result = await getCurrentUser()
      setUser(result.user)
      setLoading(false)
    }
    loadUser()
  }, [])
  
  const displayName = user?.user_metadata?.full_name || 
                      (user?.email ? user.email.split('@')[0] : 'User')
  
  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between py-3">
          {/* Logo / Brand with Next.js Image component */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-10 w-10 rounded-full bg-white p-1 overflow-hidden">
              <Image
                src="/logo.png"
                alt="MamaPikin Connect Logo"
                fill
                className="object-contain"
                onError={(e) => {
                  // Fallback to emoji if image fails
                  const parent = (e.target as HTMLElement).parentElement?.parentElement
                  if (parent) {
                    const fallback = document.createElement('span')
                    fallback.className = 'text-2xl'
                    fallback.textContent = '👶'
                    parent.appendChild(fallback)
                  }
                }}
              />
            </div>
            <span className="font-bold text-lg hidden sm:inline">MamaPikin Connect</span>
            <span className="text-xs bg-green-600 px-2 py-1 rounded hidden sm:inline">SierraCare</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                  pathname === item.path
                    ? 'bg-green-800 text-white'
                    : 'hover:bg-green-600'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}
            
            {/* User Info and Logout */}
            {!loading && user && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-green-500">
                <span className="text-sm">
                  👤 {displayName}
                </span>
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
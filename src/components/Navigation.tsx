'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth'
import LogoutButton from './LogoutButton'

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const navItems = [
  { name: 'Home', path: '/', icon: '🏠' },
  { name: 'Register Patient', path: '/register', icon: '📝' },
  { name: 'ANC Visit', path: '/anc', icon: '🤰' },
  { name: 'PNC Visit', path: '/pnc', icon: '👩‍👧' },
  { name: 'Delivery', path: '/delivery', icon: '👶' },
  { name: 'Pharmacy', path: '/pharmacy', icon: '💊' },
  { name: 'Laboratory', path: '/lab', icon: '🔬' },  // ADD THIS
  { name: 'Immunisation', path: '/immunisation', icon: '💉' },
]
  
    useEffect(() => {
    async function loadUser() {
      const { user } = await getCurrentUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [])
  
  return (
    <nav className="bg-green-700 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between py-3">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">👶</span>
            <span className="font-bold text-lg">MamaPikin Connect</span>
            <span className="text-xs bg-green-600 px-2 py-1 rounded">SierraCare</span>
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
                  👤 {user.email?.split('@')[0]}
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
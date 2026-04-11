'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()
  
  const navItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Register Patient', path: '/register', icon: '📝' },
    { name: 'ANC Visit', path: '/anc', icon: '🤰' },
    { name: 'Immunisation', path: '/immunisation', icon: '💉' },
  ]
  
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
          </div>
        </div>
      </div>
    </nav>
  )
}
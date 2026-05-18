// src/components/RoleGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navigation from './Navigation'

export default function RoleGuard({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode
  allowedRoles: string[] 
}) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkSecurityClearance() {
      const { user } = await getCurrentUser()
      
      if (!user) {
        setIsAuthorized(false)
        return
      }

      // We look for the role in user_metadata (defaulting to 'nurse' or 'user' if not set)
      const userRole = (user.user_metadata?.role || 'user').toLowerCase()

      // Admins bypass all locks. Otherwise, check if their role is in the allowed list.
      if (userRole === 'admin' || allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
      }
    }

    checkSecurityClearance()
  }, [allowedRoles])

  // While checking the database...
  if (isAuthorized === null) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="text-xl font-bold text-gray-500 animate-pulse flex flex-col items-center gap-3">
            <span className="text-4xl">🔐</span>
            <span>Verifying Security Clearance...</span>
          </div>
        </div>
      </>
    )
  }

  // If they fail the background check...
  if (isAuthorized === false) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 text-center">
          <div className="text-7xl mb-4">🛑</div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">RESTRICTED AREA</h1>
          <p className="text-gray-600 mb-6 font-medium text-lg max-w-md">
            Your current security clearance does not allow access to this module. Please contact the Hospital Administrator if you need elevated access.
          </p>
          <button 
            onClick={() => router.push('/')} 
            className="px-6 py-3 bg-gray-800 text-white font-black rounded-lg hover:bg-gray-900 shadow-lg transition-transform hover:-translate-y-1"
          >
            ← Return to Authorized Zone
          </button>
        </div>
      </>
    )
  }

  // If they pass, render the protected page!
  return <>{children}</>
}
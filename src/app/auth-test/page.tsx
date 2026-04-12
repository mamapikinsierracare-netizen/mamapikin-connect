'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    await signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      {user ? (
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-green-700">✅ Logged in as: {user.email}</p>
          <p className="text-green-700">User ID: {user.id}</p>
          <button 
            onClick={handleLogout}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="bg-yellow-100 p-4 rounded-lg">
          <p className="text-yellow-700">❌ Not logged in</p>
          <a href="/login" className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded">
            Go to Login
          </a>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('nurse@mamapikin.com')
  const [password, setPassword] = useState('nurse123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Attempting login with:', email)
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('Login response:', { data, error: signInError })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else if (data?.user) {
      console.log('Login successful, redirecting...')
      // Force redirect using multiple methods for reliability
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👶🤰</div>
          <h1 className="text-2xl font-bold text-green-700">MamaPikin Connect</h1>
          <p className="text-gray-600">Sierra Leone Maternal & Child Health System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
            } transition-colors`}
          >
            {loading ? 'Logging in...' : 'Login to System'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-gray-100 rounded-lg text-sm">
          <p className="font-medium text-gray-700 mb-1">Demo Credentials:</p>
          <p className="text-gray-600">Email: nurse@mamapikin.com</p>
          <p className="text-gray-600">Password: nurse123</p>
        </div>
      </div>
    </div>
  )
}
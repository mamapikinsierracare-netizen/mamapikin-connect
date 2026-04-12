'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-white text-sm"
    >
      🚪 Logout
    </button>
  )
}
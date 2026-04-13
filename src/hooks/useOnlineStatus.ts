// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    const checkOnlineStatus = () => {
      const online = navigator.onLine
      console.log(`🌐 Network status: ${online ? 'ONLINE' : 'OFFLINE'}`)
      setIsOnline(online)
      setHasChecked(true)
    }

    checkOnlineStatus()

    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)

    const interval = setInterval(checkOnlineStatus, 5000)

    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, hasChecked }
}
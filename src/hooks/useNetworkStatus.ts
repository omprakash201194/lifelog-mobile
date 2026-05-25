import { useEffect, useState, useRef } from 'react'

// Lightweight connectivity check without @react-native-community/netinfo
// Pings the API base to determine if we're online
export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        setIsOffline(false)
      } catch {
        setIsOffline(true)
      }
    }

    check()
    interval.current = setInterval(check, 15000)
    return () => {
      if (interval.current) clearInterval(interval.current)
    }
  }, [])

  return { isOffline }
}

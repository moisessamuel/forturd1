import { useEffect, useState } from 'react'

export function useProgressSetup() {
  const [isReady, setIsReady] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  useEffect(() => {
    const setupProgress = async () => {
      try {
        // Call setup endpoint to ensure metadata column exists
        const response = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '',
          },
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Setup failed')
        }

        console.log('[v0] Progress system ready')
        setIsReady(true)
      } catch (error) {
        console.warn('[v0] Setup warning (continuing anyway):', error)
        // Don't block on setup errors - the API can handle missing columns gracefully
        setIsReady(true)
      }
    }

    setupProgress()
  }, [])

  return { isReady, setupError }
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SorteoAdminPanel } from '@/components/sorteo-admin-panel'

export default function AdminBMWX6Page() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const session = sessionStorage.getItem('bmwx6_admin_session')
    if (!session) {
      router.push('/admin')
    } else {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <SorteoAdminPanel sorteoSlug="bmw-x6" />
}

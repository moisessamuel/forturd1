'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SorteosDiagnostic() {
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const checkAndInit = async () => {
    try {
      setIsChecking(true)
      console.log('[v0] Checking sorteos status...')

      // First check current status
      const checkRes = await fetch('/api/admin/check-sorteos')
      const checkData = await checkRes.json()
      console.log('[v0] Current status:', checkData)
      setStatus(checkData)

      if (!checkData.bmw_x6_exists || !checkData.bmw_x7_exists) {
        console.log('[v0] Missing sorteos, initializing...')
        const initRes = await fetch('/api/admin/init-sorteos', { method: 'POST' })
        const initData = await initRes.json()
        console.log('[v0] Init result:', initData)

        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 2000))

        const checkRes2 = await fetch('/api/admin/check-sorteos')
        const checkData2 = await checkRes2.json()
        console.log('[v0] Status after init:', checkData2)
        setStatus(checkData2)

        if (checkData2.bmw_x6_exists && checkData2.bmw_x7_exists) {
          toast.success('Sorteos inicializados correctamente')
          // Reload page to refresh components
          window.location.reload()
        } else {
          toast.error('No se pudieron crear los sorteos')
        }
      } else {
        toast.success('Sorteos existen correctamente')
      }
    } catch (error) {
      console.error('[v0] Error in diagnostic:', error)
      toast.error('Error en el diagnóstico')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={checkAndInit}
        disabled={isChecking}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {isChecking ? 'Verificando...' : 'Verificar Sorteos'}
      </Button>
      {status && (
        <div className="mt-2 text-xs bg-background border border-primary rounded p-2 max-w-xs">
          <p>X6: {status.bmw_x6_exists ? '✓' : '✗'}</p>
          <p>X7: {status.bmw_x7_exists ? '✓' : '✗'}</p>
        </div>
      )}
    </div>
  )
}

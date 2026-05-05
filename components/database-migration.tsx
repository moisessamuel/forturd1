import { useEffect, useState } from 'react'

export function DatabaseMigration() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const runMigration = async () => {
      try {
        setStatus('running')
        setMessage('Inicializando base de datos...')
        
        const response = await fetch('/api/admin/migrate', {
          method: 'POST',
        })
        
        const data = await response.json()
        
        if (response.ok) {
          setStatus('done')
          setMessage(data.message || 'Base de datos lista')
          console.log('[v0] Migration successful:', data)
        } else {
          setStatus('error')
          setMessage(data.error || 'Error en la migración')
          console.error('[v0] Migration failed:', data)
        }
      } catch (error) {
        setStatus('error')
        setMessage('Error al conectar con el servidor')
        console.error('[v0] Migration error:', error)
      }
    }

    // Run migration only once on component mount
    runMigration()
  }, [])

  // Don't render anything - this is just for initialization
  return null
}

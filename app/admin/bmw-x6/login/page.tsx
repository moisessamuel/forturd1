'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'

export default function BMWX6AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    const session = sessionStorage.getItem('bmwx6_admin_session')
    if (session) {
      router.push('/admin/bmw-x6')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas')
      }

      // Verify user has access to BMW X6
      if (data.role !== 'sorteo_bmw-x6' && data.role !== 'admin') {
        throw new Error('No tienes acceso a este panel')
      }

      sessionStorage.setItem('bmwx6_admin_session', JSON.stringify(data))
      toast.success('Inicio de sesión exitoso')
      router.push('/admin/bmw-x6')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4 h-32 w-48">
            <Image
              src="/images/bmw-x6.jpg"
              alt="BMW X6"
              fill
              className="rounded-lg object-cover"
            />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-primary">Panel BMW X6</h1>
          <p className="text-center text-muted-foreground">
            Acceso restringido — Solo personal autorizado
          </p>
        </div>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Usuario</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="bg-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Contraseña</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="bg-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <User className="mr-2 h-4 w-4" />
                {isLoading ? 'Verificando...' : 'Iniciar sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

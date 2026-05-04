'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { User, Lock, Eye, EyeOff } from 'lucide-react'

export default function RuletaLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/ruleta-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales invalidas')
      }

      sessionStorage.setItem('ruleta_admin_session', JSON.stringify({
        username: data.username,
        role: data.role,
        loginTime: Date.now(),
      }))

      router.push('/admin/ruleta')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Image
          src="/images/ruleta-forturd.png"
          alt="Ruleta FortuRD"
          width={200}
          height={200}
          className="mx-auto h-40 w-40 object-contain"
        />
        <h1 className="mt-4 text-2xl font-bold text-primary">Panel Ruleta</h1>
        <p className="text-muted-foreground">Acceso restringido - Solo personal autorizado</p>
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  placeholder="Usuario"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contrasena</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Contrasena"
                  required
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

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary font-bold text-primary-foreground"
            >
              {loading ? 'Verificando...' : 'Iniciar sesion'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, User, Car, Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'

type ViewState = 'login' | 'panel-selection'

interface UserSession {
  username: string
  role: string
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [viewState, setViewState] = useState<ViewState>('login')
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)

  useEffect(() => {
    // Check if already logged in via cookie session
    fetch('/api/admin/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.role) {
          // If user is pocoyo/admin, show panel selection
          if (data.role === 'admin' || data.user?.username?.toLowerCase() === 'pocoyo') {
            setCurrentUser({ username: data.user?.username || 'admin', role: data.role })
            setViewState('panel-selection')
          } else {
            redirectToPanel(data.role)
          }
        }
      })
      .catch(() => {})
    
    // Also check sessionStorage for legacy sessions
    const bmwx6Session = sessionStorage.getItem('bmwx6_admin_session')
    const bmwx7Session = sessionStorage.getItem('bmwx7_admin_session')
    const ruletaSession = sessionStorage.getItem('ruleta_admin_session')
    const adminSession = sessionStorage.getItem('admin_session')
    
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession)
        setCurrentUser({ username: session.username, role: session.role })
        setViewState('panel-selection')
        return
      } catch {}
    }
    
    if (bmwx6Session) {
      router.push('/admin/bmw-x6')
    } else if (bmwx7Session) {
      router.push('/admin/bmw-x7')
    } else if (ruletaSession) {
      router.push('/admin/ruleta')
    }
  }, [router])

  const redirectToPanel = (role: string) => {
    switch (role) {
      case 'sorteo_bmw-x6':
        router.push('/admin/bmw-x6')
        break
      case 'sorteo_bmw-x7':
        router.push('/admin/bmw-x7')
        break
      case 'ruleta_admin':
      case 'ruleta':
        router.push('/admin/ruleta')
        break
      default:
        // For admin role, show panel selection
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/unified-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales invalidas')
      }

      // Store session based on role
      const sessionData = {
        username: data.user.username,
        role: data.user.role,
        loginTime: Date.now(),
      }

      // For admin/pocoyo user, show panel selection
      if (data.user.role === 'admin' || data.user.username.toLowerCase() === 'pocoyo') {
        sessionStorage.setItem('admin_session', JSON.stringify(sessionData))
        setCurrentUser({ username: data.user.username, role: data.user.role })
        setViewState('panel-selection')
        toast.success('Bienvenido ' + data.user.username)
      } else if (data.user.role === 'sorteo_bmw-x6') {
        sessionStorage.setItem('bmwx6_admin_session', JSON.stringify(sessionData))
        toast.success('Inicio de sesion exitoso')
        router.push('/admin/bmw-x6')
      } else if (data.user.role === 'sorteo_bmw-x7') {
        sessionStorage.setItem('bmwx7_admin_session', JSON.stringify(sessionData))
        toast.success('Inicio de sesion exitoso')
        router.push('/admin/bmw-x7')
      } else if (data.user.role === 'ruleta_admin' || data.user.role === 'ruleta') {
        sessionStorage.setItem('ruleta_admin_session', JSON.stringify(sessionData))
        toast.success('Inicio de sesion exitoso')
        router.push('/admin/ruleta')
      } else {
        // Default: show panel selection
        sessionStorage.setItem('admin_session', JSON.stringify(sessionData))
        setCurrentUser({ username: data.user.username, role: data.user.role })
        setViewState('panel-selection')
        toast.success('Bienvenido ' + data.user.username)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesion')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePanelSelect = (panel: string) => {
    const sessionData = {
      username: currentUser?.username || 'admin',
      role: currentUser?.role || 'admin',
      loginTime: Date.now(),
    }

    if (panel === 'bmw-x6') {
      sessionStorage.setItem('bmwx6_admin_session', JSON.stringify(sessionData))
      router.push('/admin/bmw-x6')
    } else if (panel === 'bmw-x7') {
      sessionStorage.setItem('bmwx7_admin_session', JSON.stringify(sessionData))
      router.push('/admin/bmw-x7')
    } else if (panel === 'ruleta') {
      sessionStorage.setItem('ruleta_admin_session', JSON.stringify(sessionData))
      router.push('/admin/ruleta')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session')
    sessionStorage.removeItem('bmwx6_admin_session')
    sessionStorage.removeItem('bmwx7_admin_session')
    sessionStorage.removeItem('ruleta_admin_session')
    setCurrentUser(null)
    setViewState('login')
    setUsername('')
    setPassword('')
    toast.success('Sesion cerrada')
  }

  // Panel Selection View
  if (viewState === 'panel-selection') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex flex-col items-center">
            <Image
              src="/images/forturd-logo.png"
              alt="FortuRD"
              width={150}
              height={50}
              className="mb-4 h-16 w-auto object-contain"
            />
            <h1 className="mb-2 text-2xl font-bold">Hola, {currentUser?.username}</h1>
            <p className="text-center text-muted-foreground">
              Selecciona el panel que deseas administrar
            </p>
          </div>

          <div className="grid gap-4">
            {/* BMW X6 Panel */}
            <Card 
              className="cursor-pointer border-border/50 bg-card transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
              onClick={() => handlePanelSelect('bmw-x6')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">BMW X6</h3>
                  <p className="text-sm text-muted-foreground">Panel de administracion del sorteo BMW X6</p>
                </div>
              </CardContent>
            </Card>

            {/* BMW X7 Panel */}
            <Card 
              className="cursor-pointer border-border/50 bg-card transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
              onClick={() => handlePanelSelect('bmw-x7')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">BMW X7</h3>
                  <p className="text-sm text-muted-foreground">Panel de administracion del sorteo BMW X7</p>
                </div>
              </CardContent>
            </Card>

            {/* Ruleta Panel */}
            <Card 
              className="cursor-pointer border-border/50 bg-card transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
              onClick={() => handlePanelSelect('ruleta')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Disc3 className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Ruleta</h3>
                  <p className="text-sm text-muted-foreground">Panel de administracion de la ruleta de premios</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              Cerrar sesion
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Login View
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/images/forturd-logo.png"
            alt="FortuRD"
            width={150}
            height={50}
            className="mb-4 h-16 w-auto object-contain"
          />
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Panel de Administracion</h1>
          <p className="text-center text-muted-foreground">
            Acceso centralizado — Solo personal autorizado
          </p>
        </div>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="bg-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contrasena"
                    className="bg-input pl-10 pr-10"
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
                {isLoading ? 'Verificando...' : 'Iniciar sesion'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Este acceso esta protegido y monitoreado.
          <br />
          Los intentos no autorizados seran registrados.
        </p>
      </div>
    </main>
  )
}

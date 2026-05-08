'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { RuletaWheel } from '@/components/ruleta-wheel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Gift, Upload, DollarSign, Phone, User, Mail, CheckCircle, PartyPopper, X, Copy, Plus, Minus, Clock } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface FreeSpinData {
  numero_boleto: string
  nombre: string
  telefono: string
  used: boolean
  total_boletos?: number  // Total tickets purchased
  giros_usados?: number   // Spins already used
  giros_disponibles?: number // Available free spins
}

interface Premio {
  id: string
  nombre: string
  tipo: 'premio' | 'sin_premio'
  probabilidad: number
  descripcion: string
}

interface PaymentMethod {
  id: string
  nombre: string
  shortName: string
  cuenta: string
  tipoCuenta: string
  image: string
  monedas: string[]
  isCashApp?: boolean
  cashAppLink?: string
  isPaypal?: boolean
  paypalLink?: string
}

const PRECIO_GIRO_DOP = 100
const PRECIO_GIRO_USD = 2

const allPaymentMethods: PaymentMethod[] = [
  { id: 'bhd', nombre: 'Banco BHD Leon', shortName: 'BHD', cuenta: '39024000017', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/bhd.jpeg', monedas: ['DOP'] },
  { id: 'banreservas', nombre: 'Banreservas', shortName: 'BR', cuenta: '9606689516', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/banreservas.jpeg', monedas: ['DOP'] },
  { id: 'popular', nombre: 'Banco Popular', shortName: 'BP', cuenta: '854866779', tipoCuenta: 'Cuenta Corriente', image: '/images/banks/popular.jpeg', monedas: ['DOP'] },
  { id: 'qik', nombre: 'QIK', shortName: 'QIK', cuenta: '1011274745', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/qik.jpeg', monedas: ['DOP'] },
  { id: 'santacruz', nombre: 'Santa Cruz', shortName: 'SC', cuenta: '11522010002222', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/santacruz.jpeg', monedas: ['DOP'] },
  { id: 'apopular', nombre: 'Asociacion Popular', shortName: 'AP', cuenta: '1036509737', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/apopular.jpeg', monedas: ['DOP'] },
  { id: 'cashapp', nombre: 'Cash App', shortName: 'CA', cuenta: '$FortunaRD', tipoCuenta: '', image: '/images/banks/cashapp.jpeg', monedas: ['USD'], isCashApp: true, cashAppLink: 'https://cash.app/$FortunaRD' },
  { id: 'zelle', nombre: 'Zelle', shortName: 'Z', cuenta: '+1 (504) 777-1271', tipoCuenta: 'Zelle', image: '/images/banks/zelle.jpeg', monedas: ['USD'] },
  { id: 'paypal', nombre: 'PayPal', shortName: 'PP', cuenta: 'paypal.me/moisessamuel1', tipoCuenta: 'Pago en linea', isPaypal: true, paypalLink: 'https://www.paypal.me/moisessamuel1', image: '/images/banks/paypal.jpeg', monedas: ['USD'] },
]

const titulares: Record<string, { nombre: string; cedula: string }> = {
  bhd: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  banreservas: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  popular: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  qik: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  santacruz: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  apopular: { nombre: 'Moises Samuel Escano Bravo', cedula: '402-3305853-2' },
  zelle: { nombre: 'Robinson Yunior Guzman Veras', cedula: '+1 (504) 777-1271' },
  cashapp: { nombre: 'Rosio Guzman', cedula: '' },
  paypal: { nombre: 'Moises Samuel', cedula: '' },
}

function RuletaPageContent() {
  const searchParams = useSearchParams()
  const [premios, setPremios] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  
  // Free spin state
  const [freeSpinData, setFreeSpinData] = useState<FreeSpinData | null>(null)
  const [hasFreeSpinUsed, setHasFreeSpinUsed] = useState(false)
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0)
  const [ticketPending, setTicketPending] = useState(false)
  
  // Quantity selector state
  const [spinQuantity, setSpinQuantity] = useState(1)
  
  // Purchase flow state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [moneda, setMoneda] = useState<'DOP' | 'USD'>('DOP')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [comprobanteUrl, setComprobanteUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  const [jugadaId, setJugadaId] = useState<string | null>(null)
  
  // Spin state
  const [canSpin, setCanSpin] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinResult, setSpinResult] = useState<Premio | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [paidSpinsRemaining, setPaidSpinsRemaining] = useState(0)
  
  // Verification modal state (for users who already have spins)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationPhone, setVerificationPhone] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [isPendingPayment, setIsPendingPayment] = useState(false)
  
  // Calculate total price
  const totalPriceDOP = spinQuantity * PRECIO_GIRO_DOP
  const totalPriceUSD = spinQuantity * PRECIO_GIRO_USD

  const paymentMethods = allPaymentMethods.filter(m => m.monedas.includes(moneda))

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(`${label} copiado`)
      }).catch(() => {
        fallbackCopy(text, label)
      })
    } else {
      fallbackCopy(text, label)
    }
  }

  const fallbackCopy = (text: string, label: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    toast.success(`${label} copiado`)
  }

  useEffect(() => {
    fetch('/api/ruleta')
      .then(r => r.json())
      .then(data => {
        setPremios(data)
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  // Check for free spin from verificador - fetch from DB
  useEffect(() => {
    const isFreeSpin = searchParams.get('freeSpin') === 'true'
    if (isFreeSpin && typeof window !== 'undefined') {
      const storedData = sessionStorage.getItem('freeSpin')
      if (storedData) {
        try {
          const data: FreeSpinData = JSON.parse(storedData)
          
          // Fetch actual spin count from database
          fetch(`/api/ruleta/free-spin-count?numero_boleto=${data.numero_boleto}`)
            .then(r => r.json())
            .then(spinData => {
              const totalBoletos = spinData.total_boletos || 1
              const girosUsados = spinData.giros_usados || 0
              const girosDisponibles = totalBoletos - girosUsados
              const estado = spinData.estado || 'pendiente'
              
              const updatedData = {
                ...data,
                total_boletos: totalBoletos,
                giros_usados: girosUsados,
                giros_disponibles: girosDisponibles,
              }
              
              setFreeSpinData(updatedData)
              setFreeSpinsRemaining(girosDisponibles)
              
              // Pre-fill form data with ticket info
              setFormData({
                nombre: data.nombre,
                telefono: data.telefono,
                email: '',
              })
              
              // Check if ticket is approved before allowing spin
              if (estado !== 'aprobado') {
                setCanSpin(false)
                setTicketPending(true)
                toast.warning(`Tu boleto #${data.numero_boleto} está pendiente de confirmación. Una vez aprobado podrás usar tu giro gratis.`, { duration: 6000 })
              } else if (girosDisponibles > 0) {
                setCanSpin(true)
                toast.success(`Bienvenido ${data.nombre}! Tienes ${girosDisponibles} giro${girosDisponibles > 1 ? 's' : ''} gratis.`, { duration: 4000 })
              } else {
                setHasFreeSpinUsed(true)
                toast.info('Ya usaste todos tus giros gratis. Puedes comprar más giros.', { duration: 4000 })
              }
            })
            .catch(() => {
              // Fallback to stored data
              if (!data.used) {
                setFreeSpinData(data)
                setFreeSpinsRemaining(1)
                setCanSpin(true)
                setFormData({
                  nombre: data.nombre,
                  telefono: data.telefono,
                  email: '',
                })
                toast.success(`Bienvenido ${data.nombre}! Tienes 1 giro gratis.`, { duration: 4000 })
              } else {
                setHasFreeSpinUsed(true)
              }
            })
        } catch {
          console.error('Error parsing free spin data')
        }
      }
    }
  }, [searchParams])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.url) {
        setComprobanteUrl(data.url)
        setComprobante(file)
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
    setUploading(false)
  }

  const handlePurchase = async () => {
    if (!formData.nombre || !formData.telefono || !selectedMethod || !comprobanteUrl) {
      return
    }

    setSubmitting(true)
    try {
      const totalMonto = moneda === 'DOP' ? totalPriceDOP : totalPriceUSD
      
      const purchaseData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email || null,
        monto: totalMonto,
        moneda,
        metodo_pago: selectedMethod.nombre,
        comprobante_url: comprobanteUrl,
        cantidad_giros: spinQuantity,
        numero_boleto_referencia: freeSpinData?.numero_boleto || null,
      }

      const response = await fetch('/api/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      })

      const data = await response.json()
      
      if (!response.ok) {
        toast.error(data.error || 'Error al enviar el comprobante')
        setSubmitting(false)
        return
      }

      if (data.success) {
        setJugadaId(data.jugada_id)
        setPurchaseComplete(true)
        setShowPurchaseModal(false)
        
        // Check if this requires admin approval (paid spins)
        if (data.requires_approval) {
          // Paid spin - needs admin confirmation before spinning
          setPaidSpinsRemaining(0)
          setCanSpin(false)
          toast.info('Comprobante enviado. Tu pago sera verificado pronto y podras girar una vez aprobado.', {
            duration: 5000,
          })
        } else {
          // Free spin or auto-approved - can spin immediately
          setPaidSpinsRemaining(spinQuantity)
          setCanSpin(true)
          toast.success(`Compra de ${spinQuantity} giro${spinQuantity > 1 ? 's' : ''} completada! Ya puedes girar.`, {
            duration: 3000,
          })
        }
      } else {
        toast.error(data.error || 'Error al enviar el comprobante')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Error de conexion. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  const handleStartSpin = () => {
    setIsSpinning(true)
  }

  // Verify phone number and check for confirmed spins
  const handleVerifyPhone = async () => {
    if (!verificationPhone.trim()) {
      setVerificationError('Por favor ingresa tu número de teléfono')
      return
    }

    setVerifying(true)
    setVerificationError('')

    try {
      const response = await fetch(`/api/ruleta/verify-spins?telefono=${encodeURIComponent(verificationPhone)}`)
      const data = await response.json()

      if (response.ok && data.success) {
        if (data.giros_disponibles > 0) {
          // User has confirmed spins available
          // Distinguish between free spins (from tickets) and paid spins
          const freeSpins = data.giros_gratis_disponibles || 0
          const paidSpins = data.giros_pagados_disponibles || 0
          
          // IMPORTANT: Reset ALL spin states to EXACTLY what the server says
          // This prevents any accumulation from previous sessions or purchases
          setFreeSpinsRemaining(0) // Reset first
          setPaidSpinsRemaining(0) // Reset first
          setFreeSpinData(null) // Reset first
          setJugadaId(null) // Reset first
          
          // Now set the EXACT values from the server
          // Set free spin data if they have free spins from approved tickets
          if (freeSpins > 0) {
            setFreeSpinsRemaining(freeSpins)
            // Create a free spin data object for the session
            setFreeSpinData({
              numero_boleto: 'TICKET', // Generic since it's from verification
              nombre: data.nombre || '',
              telefono: verificationPhone,
              used: false,
              giros_disponibles: freeSpins,
            })
          }
          
          // Set paid spins if they have them
          if (paidSpins > 0) {
            setPaidSpinsRemaining(paidSpins)
            setJugadaId(data.jugada_id)
          }
          
          setFormData(prev => ({ ...prev, telefono: verificationPhone, nombre: data.nombre || '' }))
          setCanSpin(true)
          setShowVerificationModal(false)
          setVerificationPhone('')
          
          // Show message indicating what spins they have
          let message = ''
          if (freeSpins > 0 && paidSpins > 0) {
            message = `Tienes ${freeSpins} giro${freeSpins > 1 ? 's' : ''} gratis y ${paidSpins} giro${paidSpins > 1 ? 's' : ''} comprado${paidSpins > 1 ? 's' : ''}!`
          } else if (freeSpins > 0) {
            message = `Tienes ${freeSpins} giro${freeSpins > 1 ? 's' : ''} gratis disponible${freeSpins > 1 ? 's' : ''}!`
          } else {
            message = `Tienes ${paidSpins} giro${paidSpins > 1 ? 's' : ''} comprado${paidSpins > 1 ? 's' : ''} disponible${paidSpins > 1 ? 's' : ''}!`
          }
          
          // Also warn about pending tickets if they have any
          if (data.boletos_pendientes > 0) {
            message += ` (${data.boletos_pendientes} boleto${data.boletos_pendientes > 1 ? 's' : ''} pendiente${data.boletos_pendientes > 1 ? 's' : ''} de confirmación)`
          }
          
          toast.success(message, { duration: 5000 })
        } else {
          setVerificationError('No tienes giros disponibles. Compra giros para participar.')
        }
      } else if (data.pending) {
        setIsPendingPayment(true)
        setVerificationError(data.error || 'Tu boleto está pendiente de confirmación.')
      } else {
        setIsPendingPayment(false)
        setVerificationError(data.error || 'No se encontraron compras con este número de teléfono.')
      }
    } catch {
      setVerificationError('Error de conexión. Intenta de nuevo.')
    }

    setVerifying(false)
  }

  const handleSpinComplete = async (premio: Premio) => {
    setSpinResult(premio)
    setIsSpinning(false)
    setShowResultModal(true)

    // Record the result and get EXACT remaining spins from server
    if (jugadaId) {
      try {
        const spinResponse = await fetch('/api/ruleta/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jugada_id: jugadaId,
            premio_id: premio.id,
            resultado: premio.nombre,
          }),
        })
        
        const spinData = await spinResponse.json()
        
        // Use server's EXACT remaining count - this is the source of truth
        if (spinData.giros_restantes !== undefined) {
          setPaidSpinsRemaining(spinData.giros_restantes)
          
          // If all paid spins are used, check if we have free spins
          if (spinData.giros_restantes <= 0) {
            setCanSpin(freeSpinsRemaining > 0)
          } else {
            setCanSpin(true)
          }
        }
      } catch (error) {
        console.error('Error recording spin:', error)
        // Fallback to local decrement if server call fails
        const newPaidRemaining = paidSpinsRemaining - 1
        setPaidSpinsRemaining(Math.max(0, newPaidRemaining))
        setCanSpin(newPaidRemaining > 0 || freeSpinsRemaining > 0)
      }
    }

    // If this was a free spin (no jugadaId or using free spin data)
    if (freeSpinData && freeSpinsRemaining > 0 && !jugadaId) {
      try {
        await fetch('/api/ruleta/free-spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_boleto: freeSpinData.numero_boleto,
            nombre: freeSpinData.nombre,
            telefono: freeSpinData.telefono,
            premio_id: premio.id,
            resultado: premio.nombre,
          }),
        })

        // Update free spins remaining
        const newRemaining = freeSpinsRemaining - 1
        setFreeSpinsRemaining(newRemaining)
        
        if (newRemaining <= 0) {
          const updatedData = { ...freeSpinData, used: true, giros_disponibles: 0 }
          sessionStorage.setItem('freeSpin', JSON.stringify(updatedData))
          setFreeSpinData(updatedData)
          setHasFreeSpinUsed(true)
          setCanSpin(paidSpinsRemaining > 0)
        } else {
          // Still have free spins
          setCanSpin(true)
        }
      } catch (error) {
        console.error('Error recording free spin:', error)
      }
    } else if (!jugadaId && paidSpinsRemaining > 0) {
      // No jugadaId but we're supposed to have paid spins - something is wrong
      // This shouldn't happen but handle gracefully
      const newPaidRemaining = paidSpinsRemaining - 1
      setPaidSpinsRemaining(Math.max(0, newPaidRemaining))
      
      if (newPaidRemaining <= 0 && freeSpinsRemaining <= 0) {
        setCanSpin(false)
      } else {
        setCanSpin(true)
      }
    } else if (!jugadaId && freeSpinsRemaining <= 0) {
      setCanSpin(false)
    }
  }



  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 
            className="mb-2 text-2xl font-black uppercase tracking-wider md:text-3xl"
            style={{ 
              textShadow: '0 0 30px rgba(218,165,32,0.8), 0 0 60px rgba(218,165,32,0.4)',
              letterSpacing: '0.05em',
              fontWeight: 900,
              color: '#FFD700'
            }}
          >
            Ruleta FortuRD
          </h1>
          <p className="text-muted-foreground">
            Gira la ruleta y gana increíbles premios
          </p>
        </div>

        {/* Price info */}
        <div className="mb-8 flex justify-center gap-4">
          <Badge variant="outline" className="border-primary px-4 py-2 text-lg">
            <DollarSign className="mr-1 h-4 w-4" />
            RD${PRECIO_GIRO_DOP} / US${PRECIO_GIRO_USD}
          </Badge>
        </div>

        {/* Roulette Wheel */}
        <div className="mb-8 flex justify-center">
<RuletaWheel
  premios={premios}
  onSpinComplete={handleSpinComplete}
  canSpin={canSpin}
  isSpinning={isSpinning}
  onStartSpin={handleStartSpin}
  playerTelefono={formData.telefono || freeSpinData?.telefono || verificationPhone || 'unknown'}
  playerNombre={formData.nombre || freeSpinData?.nombre}
  jugadaId={jugadaId || undefined}
  spinType={freeSpinData ? 'gratis' : 'pagado'}
  spinMonto={moneda === 'DOP' ? PRECIO_GIRO_DOP : PRECIO_GIRO_USD}
  spinMoneda={moneda}
/>
        </div>

        {/* Pending Ticket Banner */}
        {freeSpinData && ticketPending && (
          <div className="mx-auto mb-6 max-w-lg">
            <Card className="border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-yellow-400">
                  GIRO GRATIS PENDIENTE
                </p>
                <p className="text-sm text-muted-foreground">
                  Boleto #{freeSpinData.numero_boleto} - {freeSpinData.nombre}
                </p>
                <p className="mt-2 text-xs text-yellow-500">
                  Tu boleto está pendiente de confirmación de pago. Una vez aprobado podrás usar tu giro gratis.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Free Spin Banner */}
        {freeSpinData && freeSpinsRemaining > 0 && canSpin && !ticketPending && (
          <div className="mx-auto mb-6 max-w-lg">
            <Card className="border-green-500/50 bg-gradient-to-r from-green-500/20 to-primary/20">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-green-400">
                  {freeSpinsRemaining} GIRO{freeSpinsRemaining > 1 ? 'S' : ''} GRATIS DISPONIBLE{freeSpinsRemaining > 1 ? 'S' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Boleto #{freeSpinData.numero_boleto} - {freeSpinData.nombre}
                </p>
                {freeSpinData.total_boletos && freeSpinData.total_boletos > 1 && (
                  <p className="mt-1 text-xs text-green-400">
                    {freeSpinData.total_boletos} boletos = {freeSpinData.total_boletos} giros gratis
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Presiona el boton central de la ruleta para girar
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Paid spins remaining banner */}
        {paidSpinsRemaining > 0 && (
          <div className="mx-auto mb-6 max-w-lg">
            <Card className="border-primary/50 bg-gradient-to-r from-primary/20 to-yellow-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-primary">
                  {paidSpinsRemaining} GIRO{paidSpinsRemaining > 1 ? 'S' : ''} COMPRADO{paidSpinsRemaining > 1 ? 'S' : ''} DISPONIBLE{paidSpinsRemaining > 1 ? 'S' : ''}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Presiona el boton central de la ruleta para girar
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Girar Ruleta Section */}
        {!canSpin && !purchaseComplete && (
          <div className="mx-auto mb-6 max-w-lg text-center">
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-yellow-500/10">
              <CardContent className="p-6">
                <p className="mb-4 text-lg font-bold text-primary">
                  {hasFreeSpinUsed ? 'COMPRAR MAS GIROS' : 'GIRAR RULETA'}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  {hasFreeSpinUsed 
                    ? `Compra mas giros por RD$${PRECIO_GIRO_DOP} o US$${PRECIO_GIRO_USD}. Todos los giros se atribuyen al boleto #${freeSpinData?.numero_boleto || ''}`
                    : `Compra un giro por RD$${PRECIO_GIRO_DOP} o US$${PRECIO_GIRO_USD} y participa al instante`
                  }
                </p>
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="h-14 w-full bg-gradient-to-r from-primary to-yellow-500 text-lg font-bold text-black hover:from-yellow-500 hover:to-primary"
                >
                  <Gift className="mr-2 h-5 w-5" />
                  COMPRAR Y GIRAR
                </Button>
                
                {/* "Ya tengo mis giros" button */}
                <Button
                  onClick={() => setShowVerificationModal(true)}
                  variant="outline"
                  className="mt-4 h-auto w-full flex-col border-2 border-primary/60 bg-transparent py-3 transition-all hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                  <span className="text-xs text-muted-foreground">Ya tengo mis giros</span>
                  <span className="text-lg font-bold text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                    Participar ahora
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Purchase pending message */}
        {purchaseComplete && !canSpin && (
          <Card className="mx-auto max-w-md border-primary/50 bg-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-10 w-10 shrink-0 text-green-500" />
                <div>
                  <p className="font-bold text-foreground">Compra registrada</p>
                  <p className="text-sm text-muted-foreground">
                    Tu giro sera habilitado cuando se confirme el pago
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVerificationModal(true)}
                className="mt-4 w-full rounded-lg border border-primary/40 bg-transparent py-3 text-center transition-colors hover:bg-primary/10"
              >
                <p className="text-xs text-muted-foreground">Ya tengo mis giros</p>
                <p className="font-bold text-primary">Participar ahora</p>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Premios Disponibles */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
            PREMIOS DISPONIBLES
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PrizeCard nombre="1 Boleto del Sorteo" />
            <PrizeCard nombre="1 Boleto BMW X6 + 1 Boleto BMW X7" />
            <PrizeCard nombre="RD$5,000" />
            <PrizeCard nombre="RD$100,000" />
            <PrizeCard nombre="iPhone" />
            <PrizeCard nombre="Motor" />
            <PrizeCard nombre="Patineta/PS5/TV" />
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">
              COMPRAR GIRO DE RULETA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quantity selector */}
            <div>
              <Label className="mb-2 block text-sm font-semibold">CANTIDAD DE GIROS</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSpinQuantity(Math.max(1, spinQuantity - 1))}
                  disabled={spinQuantity <= 1}
                  className="h-12 w-12 rounded-full"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                <div className="flex h-16 w-20 items-center justify-center rounded-lg border-2 border-primary bg-primary/10">
                  <span className="text-3xl font-bold text-primary">{spinQuantity}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSpinQuantity(Math.min(50, spinQuantity + 1))}
                  disabled={spinQuantity >= 50}
                  className="h-12 w-12 rounded-full"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
              <div className="mt-2 flex justify-center gap-2">
                {[1, 3, 5, 10].map(qty => (
                  <Button
                    key={qty}
                    variant={spinQuantity === qty ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSpinQuantity(qty)}
                    className="min-w-[40px]"
                  >
                    {qty}
                  </Button>
                ))}
              </div>
            </div>

            {/* Currency selection */}
            <div>
              <Label className="mb-2 block text-sm font-semibold">MONEDA DE PAGO</Label>
              <div className="flex gap-2">
                <Button
                  variant={moneda === 'DOP' ? 'default' : 'outline'}
                  onClick={() => setMoneda('DOP')}
                  className="flex-1"
                >
                  DOP (Pesos)
                </Button>
                <Button
                  variant={moneda === 'USD' ? 'default' : 'outline'}
                  onClick={() => setMoneda('USD')}
                  className="flex-1"
                >
                  USD (Dolares)
                </Button>
              </div>
              
              {/* Price breakdown */}
              <div className="mt-3 rounded-lg bg-primary/10 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{spinQuantity} giro{spinQuantity > 1 ? 's' : ''} x {moneda === 'DOP' ? `RD$${PRECIO_GIRO_DOP}` : `US$${PRECIO_GIRO_USD}`}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-primary/20 pt-1">
                  <span className="font-semibold">Total a pagar:</span>
                  <span className="text-xl font-bold text-primary">
                    {moneda === 'DOP' ? `RD$${totalPriceDOP.toLocaleString()}` : `US$${totalPriceUSD}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal data */}
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Nombre Completo *
                </Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej. Juan Perez"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Número de Celular *
                </Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  placeholder="Ej. +1 809-555-1234"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Correo Electrónico (opcional)
                </Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Ej. juan@correo.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <Label className="mb-3 block text-center text-base font-bold uppercase tracking-wider text-primary" style={{ textShadow: '0 0 8px rgba(218, 165, 32, 0.4)' }}>MÉTODO DE PAGO</Label>
              <div className="flex flex-wrap justify-center gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={`relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:scale-105 ${
                      selectedMethod?.id === method.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/40 scale-105'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <Image
                      src={method.image}
                      alt={method.nombre}
                      fill
                      className="object-contain p-1.5"
                    />
                  </button>
                ))}
              </div>

              {selectedMethod && (
                <Card className="mt-4 border-primary/30 bg-primary/5">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-center font-bold text-primary">{selectedMethod.nombre}</p>
                    
                    {selectedMethod.isCashApp && (
                      <a
                        href={selectedMethod.cashAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg bg-green-600 py-3 text-center font-bold text-white hover:bg-green-500"
                      >
                        Pagar con Cash App
                      </a>
                    )}

                    {selectedMethod.isPaypal && (
                      <a
                        href={selectedMethod.paypalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg bg-blue-600 py-3 text-center font-bold text-white hover:bg-blue-500"
                      >
                        Pagar con PayPal
                      </a>
                    )}

                    {!selectedMethod.isCashApp && !selectedMethod.isPaypal && (
                      <>
                        <div className="flex items-center justify-between rounded bg-background/50 p-2">
                          <div>
                            <p className="text-xs text-muted-foreground">{selectedMethod.tipoCuenta}</p>
                            <p className="font-mono font-bold">{selectedMethod.cuenta}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(selectedMethod.cuenta, 'Cuenta')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-center text-sm">
                          <p className="text-muted-foreground">Titular:</p>
                          <p className="font-semibold">{titulares[selectedMethod.id]?.nombre}</p>
                          {titulares[selectedMethod.id]?.cedula && (
                            <p className="text-xs text-muted-foreground">{titulares[selectedMethod.id].cedula}</p>
                          )}
                        </div>
                      </>
                    )}

                    {selectedMethod.id === 'zelle' && (
                      <div className="flex items-center justify-between rounded bg-background/50 p-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Número Zelle</p>
                          <p className="font-mono font-bold">{selectedMethod.cuenta}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(selectedMethod.cuenta, 'Numero')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <p className="text-center text-sm font-bold text-primary">
                      Monto a pagar: {moneda === 'DOP' ? `RD$${totalPriceDOP.toLocaleString()}` : `US$${totalPriceUSD}`}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Upload receipt */}
            <div>
              <Label className="mb-2 block text-sm font-semibold">COMPROBANTE DE PAGO *</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
                {uploading ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                ) : comprobante ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-6 w-6" />
                    <span>{comprobante.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Toca aqui para subir tu comprobante
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Submit button */}
            <Button
              onClick={handlePurchase}
              disabled={!formData.nombre || !formData.telefono || !selectedMethod || !comprobanteUrl || submitting}
              className="w-full bg-primary py-6 text-lg font-bold text-primary-foreground"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Procesando...
                </div>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  CONFIRMAR COMPRA
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="border-primary bg-background text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              {spinResult?.tipo === 'premio' ? 'FELICIDADES!' : 'SIGUE INTENTANDO'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-8">
            {spinResult?.tipo === 'premio' ? (
              <>
                <PartyPopper className="mx-auto mb-4 h-20 w-20 text-primary" />
                <p className="text-xl font-bold text-foreground">{spinResult.nombre}</p>
                <p className="mt-2 text-muted-foreground">{spinResult.descripcion}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Te contactaremos para coordinar la entrega de tu premio
                </p>
              </>
            ) : (
              <>
                <X className="mx-auto mb-4 h-20 w-20 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">
                  No ganaste esta vez, pero puedes intentarlo de nuevo!
                </p>
              </>
            )}
          </div>

          <Button
            onClick={() => {
              setShowResultModal(false)
              setSpinResult(null)
              setPurchaseComplete(false)
              setJugadaId(null)
            }}
            className="w-full bg-primary font-bold text-primary-foreground"
          >
            {spinResult?.tipo === 'premio' ? 'CERRAR' : 'INTENTAR DE NUEVO'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Verification Modal - For users who already have spins */}
      <Dialog open={showVerificationModal} onOpenChange={(open) => {
        setShowVerificationModal(open)
        if (!open) {
          setVerificationPhone('')
          setVerificationError('')
          setIsPendingPayment(false)
        }
      }}>
        <DialogContent className="max-w-md border-primary/50 bg-background">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">
              VERIFICAR MIS GIROS
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <p className="text-center text-sm text-muted-foreground">
              Ingresa el número de teléfono con el que realizaste tu compra para verificar tus giros disponibles.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="verification-phone" className="flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4" />
                Número de Teléfono
              </Label>
              <Input
                id="verification-phone"
                type="tel"
                placeholder="Ej. 8091234567"
                value={verificationPhone}
                onChange={(e) => {
                  setVerificationPhone(e.target.value)
                  setVerificationError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyPhone()
                }}
                className="border-border bg-card"
              />
            </div>

            {isPendingPayment && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-bold text-yellow-500">PENDIENTE DE PAGO</span>
                </div>
                <p className="text-sm text-yellow-400/80">
                  {verificationError || 'Tu boleto aún no ha sido confirmado. Una vez aprobado el pago podrás usar tu giro gratis.'}
                </p>
              </div>
            )}

            {verificationError && !isPendingPayment && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {verificationError}
              </div>
            )}

            <Button
              onClick={handleVerifyPhone}
              disabled={!verificationPhone.trim() || verifying}
              className="w-full bg-gradient-to-r from-primary to-yellow-500 py-6 text-lg font-bold text-black hover:from-yellow-500 hover:to-primary"
            >
              {verifying ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Verificando...
                </div>
              ) : (
                'VERIFICAR Y PARTICIPAR'
              )}
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              Si aún no has comprado, usa el botón &quot;COMPRAR Y GIRAR&quot; para adquirir tus giros.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

// Prize Card Component (for Premios Disponibles section)
function PrizeCard({ nombre }: { nombre: string }) {
  return (
    <Card className="border-primary/30 bg-card/50 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="flex flex-col items-center p-6 text-center">
        <Gift className="mb-3 h-10 w-10 text-primary" />
        <p className="text-sm font-bold text-foreground">{nombre}</p>
      </CardContent>
    </Card>
  )
}

export default function RuletaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="text-primary">Cargando ruleta...</div></div>}>
      <RuletaPageContent />
    </Suspense>
  )
}

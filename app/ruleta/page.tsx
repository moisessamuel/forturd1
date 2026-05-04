'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { RuletaWheel } from '@/components/ruleta-wheel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Gift, Upload, DollarSign, Phone, User, Mail, CheckCircle, PartyPopper, X, Copy, Ticket } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

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

export default function RuletaPage() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  
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
      const purchaseData = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        email: formData.email || null,
        monto: moneda === 'DOP' ? PRECIO_GIRO_DOP : PRECIO_GIRO_USD,
        moneda,
        metodo_pago: selectedMethod.nombre,
        comprobante_url: comprobanteUrl,
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
        toast.success('Comprobante enviado correctamente', {
          description: 'Tu pago esta siendo verificado. Podras girar la ruleta una vez confirmado.',
          duration: 5000,
        })
        // Check payment status periodically
        const checkStatus = async () => {
          try {
            const res = await fetch(`/api/ruleta/check-status?id=${data.jugada_id}`)
            const statusData = await res.json()
            if (statusData.estado === 'confirmado') {
              setCanSpin(true)
              toast.success('Pago confirmado! Ya puedes girar la ruleta.')
            } else if (statusData.estado === 'pendiente') {
              setTimeout(checkStatus, 5000)
            }
          } catch {
            // Silently retry
            setTimeout(checkStatus, 5000)
          }
        }
        checkStatus()
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

  const handleSpinComplete = async (premio: Premio) => {
    setSpinResult(premio)
    setIsSpinning(false)
    setCanSpin(false)
    setShowResultModal(true)

    // Record the result
    if (jugadaId) {
      await fetch('/api/ruleta/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jugada_id: jugadaId,
          premio_id: premio.id,
          resultado: premio.nombre,
        }),
      })
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
            className="mb-2 text-3xl font-bold text-primary md:text-4xl"
            style={{ textShadow: '0 0 20px rgba(218,165,32,0.6)' }}
          >
            RULETA DE LA FORTUNA
          </h1>
          <p className="text-muted-foreground">
            Gira la ruleta y gana increibles premios
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
          />
        </div>

        {/* Buy spin buttons */}
        {!canSpin && !purchaseComplete && (
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => setShowPurchaseModal(true)}
              className="h-14 w-72 bg-gradient-to-r from-green-600 to-green-500 text-lg font-bold hover:from-green-500 hover:to-green-400"
            >
              <Gift className="mr-2 h-5 w-5" />
              COMPRAR GIRO - RD$100 / US$2
            </Button>
            
            <div className="text-center">
              <p className="mb-2 text-sm text-muted-foreground">o compra un boleto BMW y obtiene un giro GRATIS</p>
              <div className="flex justify-center gap-3">
                <a href="/bmw-x6">
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-black"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    BMW X6 - RD$490
                  </Button>
                </a>
                <a href="/bmw-x7">
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-black"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    BMW X7 - RD$490
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Purchase pending message */}
        {purchaseComplete && !canSpin && (
          <Card className="mx-auto max-w-md border-primary/50 bg-primary/10">
            <CardContent className="flex items-center gap-4 p-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div>
                <p className="font-bold text-foreground">Compra registrada</p>
                <p className="text-sm text-muted-foreground">
                  Tu giro sera habilitado cuando se confirme el pago
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prizes section */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
            PREMIOS DISPONIBLES
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {premios.filter(p => p.tipo === 'premio').map((premio) => (
              <Card key={premio.id} className="border-primary/30 bg-card/50">
                <CardContent className="flex flex-col items-center p-4 text-center">
                  <Gift className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-bold text-foreground">{premio.nombre}</p>
                </CardContent>
              </Card>
            ))}
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
              <p className="mt-2 text-center text-lg font-bold text-primary">
                {moneda === 'DOP' ? `RD$${PRECIO_GIRO_DOP}` : `US$${PRECIO_GIRO_USD}`} por giro
              </p>
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
                  <Phone className="h-4 w-4" /> Numero de Celular *
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
                  <Mail className="h-4 w-4" /> Correo Electronico (opcional)
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
              <Label className="mb-2 block text-sm font-semibold">METODO DE PAGO</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={`flex flex-col items-center rounded-lg border-2 p-3 transition-all ${
                      selectedMethod?.id === method.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Image
                      src={method.image}
                      alt={method.nombre}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-contain"
                    />
                    <span className="mt-1 text-xs">{method.shortName}</span>
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
                          <p className="text-xs text-muted-foreground">Numero Zelle</p>
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
                      Monto a pagar: {moneda === 'DOP' ? `RD$${PRECIO_GIRO_DOP}` : `US$${PRECIO_GIRO_USD}`}
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
    </main>
  )
}

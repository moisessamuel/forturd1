'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Clock, User, Upload, Copy, Camera, FolderOpen, Image as ImageIcon, X, Shield, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import type { Banco } from '@/lib/types'

interface FormData {
  nombre: string
  telefono: string
  email: string
  banco: string
  comprobante: File | null
  comprobanteUrl: string
}

export function UnifiedPurchaseSection() {
  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(`${label} copiado`)
      }).catch(() => {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        toast.success(`${label} copiado`)
      })
    } else {
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
  }

  // Ticket selection state
  const [quantity, setQuantity] = useState('')
  const [referralCode, setReferralCode] = useState('')
  
  // Config state
  const [precioBoleto, setPrecioBoleto] = useState(1000)
  const [precioBoletoUsd, setPrecioBoletoUsd] = useState(20)
  const [moneda, setMoneda] = useState<'DOP' | 'USD'>('DOP')
  const [bancos, setBancos] = useState<Banco[]>([])
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null)

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    telefono: '',
    email: '',
    banco: '',
    comprobante: null,
    comprobanteUrl: '',
  })

  // Confirmation state
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([])
  const [qrValue, setQrValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [purchaseComplete, setPurchaseComplete] = useState(false)
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Refs for scrolling
  const buyerDataRef = useRef<HTMLDivElement>(null)
  const paymentMethodRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)

  const allPaymentMethods = [
    { id: 'bhd', nombre: 'Banco BHD Leon', shortName: 'BHD', color: 'text-blue-600', bgColor: 'bg-blue-600', cuenta: '39024000017', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/bhd.jpeg', monedas: ['DOP'] },
    { id: 'banreservas', nombre: 'Banreservas', shortName: 'BR', color: 'text-green-600', bgColor: 'bg-green-600', cuenta: '9606689516', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/banreservas.jpeg', monedas: ['DOP'] },
    { id: 'popular', nombre: 'Banco Popular', shortName: 'BP', color: 'text-orange-600', bgColor: 'bg-orange-600', cuenta: '854866779', tipoCuenta: 'Cuenta Corriente', image: '/images/banks/popular.jpeg', monedas: ['DOP'] },
    { id: 'qik', nombre: 'QIK', shortName: 'QIK', color: 'text-purple-600', bgColor: 'bg-purple-600', cuenta: '1011274745', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/qik.jpeg', monedas: ['DOP'] },
    { id: 'santacruz', nombre: 'Santa Cruz', shortName: 'SC', color: 'text-red-600', bgColor: 'bg-red-600', cuenta: '11522010002222', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/santacruz.jpeg', monedas: ['DOP'] },
    { id: 'apopular', nombre: 'Asociacion Popular', shortName: 'AP', color: 'text-yellow-600', bgColor: 'bg-yellow-600', cuenta: '1036509737', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/apopular.jpeg', monedas: ['DOP'] },
    { id: 'cashapp', nombre: 'Cash App', shortName: 'CA', color: 'text-green-500', bgColor: 'bg-green-500', cuenta: '', tipoCuenta: '', image: '/images/banks/cashapp.jpeg', monedas: ['USD'], isCashApp: true, cashAppLink: 'https://cash.app/$FortunaRD' },
    { id: 'zelle', nombre: 'Zelle', shortName: 'Z', color: 'text-indigo-600', bgColor: 'bg-indigo-600', cuenta: '+1 (504) 777-1271', tipoCuenta: 'Zelle', image: '/images/banks/zelle.jpeg', monedas: ['USD'] },
    { id: 'paypal', nombre: 'PayPal', shortName: 'PP', color: 'text-blue-500', bgColor: 'bg-blue-500', cuenta: '', tipoCuenta: 'Pago en linea', isPaypal: true, paypalLink: 'https://www.paypal.me/moisessamuel1', image: '/images/banks/paypal.jpeg', monedas: ['USD'] },
  ]

  const paymentMethods = allPaymentMethods.filter(m => m.monedas.includes(moneda))

  const titularEduardo = {
    nombre: 'Eduardo Enrique Rodriguez Montas',
    cedula: '402-1466583-4',
  }
  const titularMoises = {
    nombre: 'Moises Samuel Escano Bravo',
    cedula: '402-3305853-2',
  }
  const titularRobinson = {
    nombre: 'Robinson Yunior Guzman Veras',
    cedula: '+1 (504) 777-1271',
  }
  const titularCashApp = {
    nombre: 'Rosio Guzman',
    cedula: '',
  }
  const getTitular = (bancoId: string) => {
    if (bancoId === 'bhd' || bancoId === 'popular') return titularMoises
    if (bancoId === 'zelle') return titularRobinson
    if (bancoId === 'cashapp') return titularCashApp
    return titularMoises
  }
  const titular = selectedBanco ? getTitular(selectedBanco.id) : titularMoises

  const precioActual = moneda === 'DOP' ? precioBoleto : precioBoletoUsd
  const total = (parseInt(quantity) || 0) * precioActual

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setPrecioBoleto(data.precio_boleto_dop)
        setPrecioBoletoUsd(data.precio_boleto_usd || 20)
      })
      .catch(console.error)

    fetch('/api/bancos')
      .then((res) => res.json())
      .then((data) => setBancos(data))
      .catch(console.error)
  }, [])

  const formatCurrency = (amount: number) => {
    if (moneda === 'USD') {
      return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    }
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  const incrementQuantity = () => {
    const current = parseInt(quantity) || 0
    setQuantity((current + 1).toString())
  }

  const decrementQuantity = () => {
    const current = parseInt(quantity) || 0
    if (current > 0) {
      setQuantity((current - 1).toString())
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif', 'application/octet-stream', '']
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)
    
    if (!isValidType) {
      toast.error('Solo se permiten imagenes PNG, JPG, WEBP o HEIC')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo excede el tamano maximo de 10MB')
      return
    }

    setIsUploading(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al subir archivo')
      }

      setFormData((prev) => ({ ...prev, comprobante: file, comprobanteUrl: data.url }))
      toast.success('Comprobante subido correctamente')
      setShowImageMenu(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al subir el comprobante'
      toast.error(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageSourceSelect = (source: 'camera' | 'file' | 'gallery') => {
    setShowImageMenu(false)
    switch (source) {
      case 'camera':
        cameraInputRef.current?.click()
        break
      case 'file':
        fileInputRef.current?.click()
        break
      case 'gallery':
        galleryInputRef.current?.click()
        break
    }
  }

  const handleSubmit = async () => {
    // Validations
    const qty = parseInt(quantity) || 0
    if (qty < 1) {
      toast.error('Por favor selecciona al menos 1 boleto')
      return
    }
    if (!formData.nombre.trim()) {
      toast.error('Por favor ingresa tu nombre completo')
      buyerDataRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!formData.telefono.trim()) {
      toast.error('Por favor ingresa tu numero de celular')
      buyerDataRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!selectedBanco) {
      toast.error('Por favor selecciona un metodo de pago')
      paymentMethodRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!formData.comprobanteUrl) {
      toast.error('Por favor sube el comprobante de pago')
      uploadRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: qty,
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email || null,
          banco: selectedBanco?.nombre,
          moneda,
          comprobante_url: formData.comprobanteUrl,
          referido_codigo: referralCode || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al procesar la compra')
      }

      const compra = await response.json()
      const tickets = compra.tickets || []
      setTicketNumbers(tickets.map((t: { numero_boleto: string }) => t.numero_boleto))
      setQrValue(compra.qr_code?.qr_value || '')
      setPurchaseComplete(true)
      toast.success('Compra registrada exitosamente!')
      
      // Scroll to confirmation
      setTimeout(() => {
        confirmationRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar la compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyTicketNumbers = () => {
    const text = ticketNumbers.map(n => n.padStart(5, '0')).join(', ')
    navigator.clipboard.writeText(text)
    toast.success(ticketNumbers.length > 1 ? 'Numeros de boletos copiados!' : 'Numero de boleto copiado!')
  }

  const handleReset = () => {
    setQuantity('')
    setReferralCode('')
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      banco: '',
      comprobante: null,
      comprobanteUrl: '',
    })
    setSelectedBanco(null)
    setExpandedBanco(null)
    setTicketNumbers([])
    setQrValue('')
    setPurchaseComplete(false)
  }

  // If purchase is complete, show only confirmation
  if (purchaseComplete) {
    return (
      <div ref={confirmationRef} className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6 text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
                <Clock className="h-10 w-10 text-white" />
              </div>
            </div>

            <h2 className="mb-2 text-2xl font-bold">{'Comprobante Recibido!'}</h2>
            <p className="mb-6 text-muted-foreground">
              Tu comprobante ha sido enviado exitosamente. Tu billete esta en estado{' '}
              <span className="font-medium text-primary">Pendiente de Validacion</span>.
            </p>

            <Card className="mb-6 border-primary/50 bg-primary/10">
              <CardContent className="p-6">
                <p className="mb-2 text-sm text-muted-foreground">
                  {ticketNumbers.length > 1 ? 'TUS NUMEROS DE BOLETOS' : 'TU NUMERO DE BOLETO'}
                </p>
                <div className="space-y-2">
                  {ticketNumbers.map((num, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-2">
                      <p className="font-mono text-2xl font-bold text-primary">
                        # {num.padStart(5, '0')}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyTicketNumbers}
                  className="mt-2 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar {ticketNumbers.length > 1 ? 'numeros' : 'numero'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Guarda {ticketNumbers.length > 1 ? 'estos numeros' : 'este numero'} para verificar el estado de tu boleto
                </p>
              </CardContent>
            </Card>

            {qrValue && (
              <Card className="mb-6 border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center p-6">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Tu QR permanente de jugador</p>
                  <div className="rounded-xl bg-white p-4">
                    <QRCodeSVG
                      value={`https://www.forturd1.com/jugador/${qrValue}`}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="mt-2 font-mono text-sm font-bold text-primary">{qrValue}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Este QR es permanente. Usalo para ver todos tus boletos y compras futuras.
                  </p>
                </CardContent>
              </Card>
            )}

            <p className="mb-6 text-xl font-semibold text-foreground">
              Boletos confirmados en 24 horas.
            </p>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 border-primary text-primary"
              >
                Comprar mas boletos
              </Button>
              <Link href="/verificar" className="flex-1">
                <Button className="w-full border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground" variant="outline">
                  Verificar Boleto
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Section 1: Ticket Selection */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <h3 className="mb-2 text-center text-3xl font-extrabold uppercase text-primary md:text-4xl" style={{ textShadow: '0 0 10px rgba(218, 165, 32, 0.6), 0 0 20px rgba(218, 165, 32, 0.3)' }}>
            COMPRA TUS BOLETOS
          </h3>
          <p className="mb-6 text-center text-base text-muted-foreground md:text-lg">
            Ingresa la cantidad deseada y procede al pago por transferencia bancaria
          </p>

          <div className="space-y-4">
            {/* Ticket Counter */}
            <div>
              <label className="mb-3 block text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
                BOLETOS
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  disabled={!quantity || parseInt(quantity) <= 0}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="h-6 w-6" />
                </button>
                <div className="flex h-16 w-24 items-center justify-center rounded-xl border-2 border-primary/50 bg-card">
                  <span className="text-3xl font-bold text-primary">{quantity || '0'}</span>
                </div>
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Codigo de Referido (Opcional)
              </label>
              <Input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ej. JUANPEREZ"
                className="bg-input"
              />
            </div>

            {/* Order Summary */}
            {parseInt(quantity) > 0 && (
              <Card className="border-primary/50 bg-primary/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Boletos: <span className="font-medium text-foreground">{quantity}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Buyer Data */}
      <Card ref={buyerDataRef} className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Datos del Comprador</h2>
            <p className="text-sm text-muted-foreground">
              Completa tus datos personales para procesar tu compra de boletos.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Nombre Completo <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Juan Perez"
                className="bg-input"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span className="text-primary">Tel</span>
                Numero de Celular <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. +1 809-555-1234"
                className="bg-input"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ingresa tu numero con codigo de pais (ej. +1, +52, +34)
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span className="text-primary">@</span>
                Correo Electronico <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ej. juan@correo.com"
                className="bg-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Payment Methods */}
      <Card ref={paymentMethodRef} className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <h2 className="mb-2 text-center text-2xl font-bold text-primary">MODOS DE PAGO</h2>
          <p className="mb-4 text-center text-muted-foreground">Elige una opcion.</p>

          {/* Currency Selector */}
          <div className="mb-6">
            <p className="mb-2 text-center text-sm font-medium text-muted-foreground">MONEDA DE PAGO</p>
            <div className="flex justify-center gap-2">
              <Button
                variant={moneda === 'DOP' ? 'default' : 'outline'}
                onClick={() => setMoneda('DOP')}
                className={moneda === 'DOP' ? 'bg-primary text-primary-foreground' : ''}
              >
                DOP (Pesos)
              </Button>
              <Button
                variant={moneda === 'USD' ? 'default' : 'outline'}
                onClick={() => setMoneda('USD')}
                className={moneda === 'USD' ? 'bg-primary text-primary-foreground' : ''}
              >
                USD (Dolares)
              </Button>
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {moneda === 'DOP' 
                ? `RD$ ${new Intl.NumberFormat('es-DO').format(precioBoleto)} por boleto`
                : `US$ ${precioBoletoUsd} por boleto`
              }
            </p>
          </div>

          {/* Payment Method Logos Grid */}
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedBanco({ id: method.id, nombre: method.nombre, cuenta: method.cuenta || '' } as Banco)
                  setFormData(prev => ({ ...prev, banco: method.nombre }))
                }}
                className={`relative overflow-hidden rounded-lg border-2 bg-white p-2 transition-all ${
                  selectedBanco?.id === method.id
                    ? 'border-primary shadow-md shadow-primary/30'
                    : 'border-border/30 hover:border-primary/50'
                }`}
              >
                <div className="relative h-12 w-full">
                  <Image
                    src={method.image}
                    alt={method.nombre}
                    fill
                    className="object-contain"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Payment Info - Inline Display */}
          {selectedBanco && (() => {
            const method = paymentMethods.find(m => m.id === selectedBanco.id)
            if (!method) return null
            return (
              <Card className="border-primary/50 bg-card">
                <CardContent className="p-4">
                  <h3 className="mb-4 text-center text-lg font-extrabold uppercase tracking-wider" style={{ color: '#DAA520', textShadow: '0 0 10px rgba(218, 165, 32, 0.6)' }}>
                    {method.nombre}
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                      <span className="text-muted-foreground">Titular</span>
                      <span className="font-semibold text-foreground">{titular.nombre}</span>
                    </div>
                    
                    {method.id !== 'zelle' && method.id !== 'cashapp' && (
                      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                        <span className="text-muted-foreground">Cedula</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{titular.cedula}</span>
                          <button
                            onClick={() => copyToClipboard(titular.cedula, 'Cedula')}
                            className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {method.id === 'cashapp' && (
                      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                        <span className="text-muted-foreground">User</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">$FortunaRD</span>
                          <button
                            onClick={() => copyToClipboard('$FortunaRD', 'User')}
                            className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {method.cuenta && (
                      <>
                        <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                          <span className="text-muted-foreground">Tipo de Cuenta</span>
                          <span className="font-semibold text-foreground">{method.tipoCuenta}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                          <span className="text-muted-foreground">Numero de Cuenta</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{method.cuenta}</span>
                            <button
                              onClick={() => copyToClipboard(method.cuenta || '', 'Cuenta')}
                              className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {method.tipoCuenta && !method.cuenta && !method.isPaypal && (
                      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-semibold text-foreground">{method.tipoCuenta}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                      <span className="text-muted-foreground">Monto a Transferir</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                    
                    {method.isPaypal && (
                      <a
                        href={`${method.paypalLink}/${moneda === 'USD' ? total : precioBoletoUsd * (parseInt(quantity) || 0)}USD`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                      >
                        Pagar con PayPal
                      </a>
                    )}
                    
                    {method.isCashApp && (
                      <a
                        href={method.cashAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-600"
                      >
                        Pagar con Cash App
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </CardContent>
      </Card>

      {/* Section 4: Upload Receipt */}
      <Card ref={uploadRef} className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="relative">
            <div
              onClick={() => !formData.comprobante && !isUploading && setShowImageMenu(!showImageMenu)}
              className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/50 p-4 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Upload className="h-6 w-6 text-primary" />
              <p className="text-center text-sm font-medium text-primary">
                {formData.comprobante
                  ? formData.comprobante.name
                  : 'Toca aqui para subir tu comprobante'}
              </p>
            </div>

            {/* Image Source Menu */}
            {showImageMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 z-50">
                <Card className="border-border bg-card shadow-xl">
                  <CardContent className="p-2">
                    <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Seleccionar origen
                    </p>
                    <button
                      type="button"
                      onClick={() => handleImageSourceSelect('camera')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-primary/10 transition-colors text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Camara</p>
                        <p className="text-xs text-muted-foreground">Tomar foto</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageSourceSelect('gallery')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-primary/10 transition-colors text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                        <ImageIcon className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Galeria</p>
                        <p className="text-xs text-muted-foreground">Seleccionar de fotos</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImageSourceSelect('file')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-primary/10 transition-colors text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                        <FolderOpen className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Archivo</p>
                        <p className="text-xs text-muted-foreground">Explorar archivos</p>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
              aria-label="Tomar foto"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
              aria-label="Seleccionar de galeria"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,application/pdf,image/*,.png,.jpg,.jpeg,.webp,.heic,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
              aria-label="Seleccionar archivo"
            />
            {formData.comprobanteUrl && (
              <div className="mt-4 flex items-center justify-center">
                <div className="relative inline-block">
                  <Image
                    src={formData.comprobanteUrl}
                    alt="Comprobante"
                    width={200}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, comprobante: null, comprobanteUrl: '' }))
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110"
                    aria-label="Eliminar comprobante"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !quantity || parseInt(quantity) < 1}
        className="w-full bg-primary py-6 text-lg font-bold text-primary-foreground hover:bg-primary/90"
      >
        {isSubmitting ? 'Procesando...' : 'CONFIRMAR COMPRA'}
        <Check className="ml-2 h-5 w-5" />
      </Button>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        Pago seguro por transferencia bancaria con validacion manual
      </p>
    </div>
  )
}

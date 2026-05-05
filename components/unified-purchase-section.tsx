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

interface UnifiedPurchaseSectionProps {
  sorteoSlug?: string
  precioDop?: number
  precioUsd?: number
}

export function UnifiedPurchaseSection({ sorteoSlug, precioDop, precioUsd }: UnifiedPurchaseSectionProps = {}) {
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
  const [precioBoleto, setPrecioBoleto] = useState(490)
  const [precioBoletoUsd, setPrecioBoletoUsd] = useState(9)
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
  const titularPayPal = {
    nombre: 'Moises Samuel',
    cedula: '',
  }
  const getTitular = (bancoId: string) => {
    if (bancoId === 'bhd' || bancoId === 'popular') return titularMoises
    if (bancoId === 'zelle') return titularRobinson
    if (bancoId === 'cashapp') return titularCashApp
    if (bancoId === 'paypal') return titularPayPal
    return titularMoises
  }
  const titular = selectedBanco ? getTitular(selectedBanco.id) : titularMoises

  const precioActual = moneda === 'DOP' ? precioBoleto : precioBoletoUsd
  const total = (parseInt(quantity) || 0) * precioActual

  useEffect(() => {
    // If sorteo-specific prices are provided, use them
    if (precioDop !== undefined) {
      setPrecioBoleto(precioDop)
    }
    if (precioUsd !== undefined) {
      setPrecioBoletoUsd(precioUsd)
    }
    
    // Otherwise fetch from config
    if (precioDop === undefined || precioUsd === undefined) {
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          if (precioDop === undefined) setPrecioBoleto(data.precio_boleto_dop)
          if (precioUsd === undefined) setPrecioBoletoUsd(data.precio_boleto_usd || 20)
        })
        .catch(console.error)
    }

    fetch('/api/bancos')
      .then((res) => res.json())
      .then((data) => setBancos(data))
      .catch(console.error)
  }, [precioDop, precioUsd])

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
          sorteo_slug: sorteoSlug || 'default',
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

            <h2 className="mb-2 text-2xl font-bold">{'¡Comprobante Recibido!'}</h2>
            <p className="mb-6 text-muted-foreground">
              Tu comprobante ha sido enviado exitosamente. Tu billete está en estado{' '}
              <span className="font-medium text-primary">Pendiente de Validación</span>.
            </p>

            <Card className="mb-6 border-primary/50 bg-primary/10">
              <CardContent className="p-6">
                <p className="mb-2 text-sm text-muted-foreground">
                  {ticketNumbers.length > 1 ? 'TUS NÚMEROS DE BOLETOS' : 'TU NÚMERO DE BOLETO'}
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
                  Copiar {ticketNumbers.length > 1 ? 'números' : 'número'}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Guarda {ticketNumbers.length > 1 ? 'estos números' : 'este número'} para verificar el estado de tu boleto.
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
                    Este QR es permanente. Úsalo para ver todos tus boletos y compras futuras.
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
                Comprar más boletos
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
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      {/* Unified Purchase Card */}
      <Card className="border-primary/30 bg-card/80">
        <CardContent className="p-5">
          <h3 className="mb-1 text-center text-2xl font-extrabold uppercase text-primary" style={{ textShadow: '0 0 10px rgba(218, 165, 32, 0.5)' }}>
            COMPRA TUS BOLETOS
          </h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Completa el formulario para adquirir tus boletos
          </p>

          <div className="space-y-4">
            {/* Quantity + Currency Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Ticket Counter - Compact */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  disabled={!quantity || parseInt(quantity) <= 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex h-12 w-14 items-center justify-center rounded-lg border-2 border-primary/50 bg-card">
                  <span className="text-2xl font-bold text-primary">{quantity || '0'}</span>
                </div>
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {/* Quick Quantity Buttons */}
              <div className="flex gap-1">
                {[1, 3, 5, 10].map(qty => (
                  <button
                    key={qty}
                    onClick={() => setQuantity(qty.toString())}
                    className={`h-8 w-8 rounded-md text-xs font-bold transition-all ${
                      parseInt(quantity) === qty 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setMoneda('DOP')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    moneda === 'DOP' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  DOP
                </button>
                <button
                  onClick={() => setMoneda('USD')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    moneda === 'USD' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  USD
                </button>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(total || 0)}
              </span>
            </div>

            {/* Personal Data - Compact */}
            <div ref={buyerDataRef} className="space-y-3 border-t border-border/50 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-primary">Nombre <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Juan Perez"
                    className="h-10 bg-input text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-primary">Telefono <span className="text-destructive">*</span></label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="8091234567"
                    className="h-10 bg-input text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-primary">Email <span className="text-xs font-normal text-muted-foreground">(opcional)</span></label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@email.com"
                    className="h-10 bg-input text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-primary">Referido <span className="text-xs font-normal text-muted-foreground">(opcional)</span></label>
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="CODIGO"
                    className="h-10 bg-input text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods - Compact Grid */}
            <div ref={paymentMethodRef} className="border-t border-border/50 pt-4">
              <p className="mb-3 text-center text-base font-bold uppercase tracking-wider text-primary" style={{ textShadow: '0 0 8px rgba(218, 165, 32, 0.4)' }}>
                Metodo de Pago
              </p>

              {/* Payment Method Logos Grid */}
              <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedBanco({ id: method.id, nombre: method.nombre, cuenta: method.cuenta || '' } as Banco)
                      setFormData(prev => ({ ...prev, banco: method.nombre }))
                    }}
                    className={`relative aspect-[2/1] overflow-hidden rounded-lg transition-all ${
                      selectedBanco?.id === method.id
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/40'
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                  >
                    <Image
                      src={method.image}
                      alt={method.nombre}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Payment Info - Compact Inline Display */}
              {selectedBanco && (() => {
                const method = paymentMethods.find(m => m.id === selectedBanco.id)
                if (!method) return null
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="mb-2 text-center text-sm font-bold text-primary">{method.nombre}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titular:</span>
                        <span className="font-medium">{titular.nombre}</span>
                      </div>
                      {method.cuenta && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Cuenta:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-primary">{method.cuenta}</span>
                            <button onClick={() => copyToClipboard(method.cuenta || '', 'Cuenta')} className="text-primary">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {method.id === 'zelle' && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Zelle:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-primary">+1 (504) 777-1271</span>
                            <button onClick={() => copyToClipboard('+15047771271', 'Telefono')} className="text-primary">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {method.id === 'cashapp' && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">User:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-primary">$FortunaRD</span>
                            <button onClick={() => copyToClipboard('$FortunaRD', 'User')} className="text-primary">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-primary/20 pt-1.5">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(total)}</span>
                      </div>
                      {method.isPaypal && (
                        <a
                          href={`${method.paypalLink}/${moneda === 'USD' ? total : precioBoletoUsd * (parseInt(quantity) || 0)}USD`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex w-full items-center justify-center rounded-md bg-blue-500 py-2 text-xs font-semibold text-white"
                        >
                          Pagar con PayPal
                        </a>
                      )}
                      {method.isCashApp && (
                        <a
                          href={method.cashAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex w-full items-center justify-center rounded-md bg-green-500 py-2 text-xs font-semibold text-white"
                        >
                          Pagar con Cash App
                        </a>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Upload Receipt - Compact */}
            <div ref={uploadRef} className="relative border-t border-border/50 pt-4">
              <div
                onClick={() => !formData.comprobante && !isUploading && setShowImageMenu(!showImageMenu)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 p-3 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Upload className="h-5 w-5 text-primary" />
                <p className="text-center text-sm font-medium text-primary">
                  {formData.comprobante ? formData.comprobante.name : 'Subir comprobante'}
                </p>
              </div>

              {/* Image Source Menu */}
              {showImageMenu && (
                <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2">
                  <Card className="border-border bg-card shadow-xl">
                    <CardContent className="p-2">
                      <button type="button" onClick={() => handleImageSourceSelect('camera')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10">
                        <Camera className="h-4 w-4 text-primary" />
                        <span className="text-sm">Camara</span>
                      </button>
                      <button type="button" onClick={() => handleImageSourceSelect('gallery')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10">
                        <ImageIcon className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Galeria</span>
                      </button>
                      <button type="button" onClick={() => handleImageSourceSelect('file')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/10">
                        <FolderOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Archivo</span>
                      </button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Hidden file inputs */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" disabled={isUploading} />
              
              {formData.comprobanteUrl && (
                <div className="mt-3 flex items-center justify-center">
                  <div className="relative inline-block">
                    <Image src={formData.comprobanteUrl} alt="Comprobante" width={120} height={120} className="rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, comprobante: null, comprobanteUrl: '' }))}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button - Inside Card */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !quantity || parseInt(quantity) < 1}
              className="mt-4 w-full bg-primary py-5 text-base font-bold text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Procesando...' : 'CONFIRMAR COMPRA'}
              <Check className="ml-2 h-5 w-5" />
            </Button>

            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Pago seguro con validacion manual
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

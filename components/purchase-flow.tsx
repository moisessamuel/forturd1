'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock, User, Upload, CreditCard, Copy, Camera, FolderOpen, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import type { Banco } from '@/lib/types'

interface PurchaseFlowProps {
  initialQuantity: number
  referralCode: string
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4

interface FormData {
  nombre: string
  telefono: string
  email: string
  banco: string
  comprobante: File | null
  comprobanteUrl: string
}

export function PurchaseFlow({ initialQuantity, referralCode, onClose }: PurchaseFlowProps) {
  const [step, setStep] = useState<Step>(1)
  const [quantity] = useState(initialQuantity)
  const [precioBoleto, setPrecioBoleto] = useState(1000)
  const [precioBoletoUsd, setPrecioBoletoUsd] = useState(20)
  const [moneda, setMoneda] = useState<'DOP' | 'USD'>('DOP')
  const [bancos, setBancos] = useState<Banco[]>([])
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null)
  const [expandedBanco, setExpandedBanco] = useState<string | null>(null)
  const [showCashPanel, setShowCashPanel] = useState(false)

  const paymentMethods = [
    { id: 'bhd', nombre: 'Banco BHD Leon', shortName: 'BHD', color: 'text-blue-600', bgColor: 'bg-blue-600', cuenta: '39024000017', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/bhd.jpeg' },
    { id: 'banreservas', nombre: 'Banreservas', shortName: 'BR', color: 'text-green-600', bgColor: 'bg-green-600', cuenta: '9606689516', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/banreservas.jpeg' },
    { id: 'popular', nombre: 'Banco Popular', shortName: 'BP', color: 'text-orange-600', bgColor: 'bg-orange-600', cuenta: '854866779', tipoCuenta: 'Cuenta Corriente', image: '/images/banks/popular.jpeg' },
    { id: 'paypal', nombre: 'PayPal', shortName: 'PP', color: 'text-blue-500', bgColor: 'bg-blue-500', cuenta: '', tipoCuenta: 'Pago en línea', isPaypal: true, paypalLink: 'https://www.paypal.me/moisessamuel1', image: '/images/banks/paypal.jpeg' },
    { id: 'qik', nombre: 'QIK', shortName: 'QIK', color: 'text-purple-600', bgColor: 'bg-purple-600', cuenta: '1011274745', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/qik.jpeg' },
    { id: 'santacruz', nombre: 'Santa Cruz', shortName: 'SC', color: 'text-red-600', bgColor: 'bg-red-600', cuenta: '11522010002222', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/santacruz.jpeg' },
    { id: 'ath', nombre: 'ATH Movil', shortName: 'ATH', color: 'text-cyan-600', bgColor: 'bg-cyan-600', cuenta: '', tipoCuenta: '', image: '/images/banks/ath.jpeg' },
    { id: 'zelle', nombre: 'Zelle', shortName: 'Z', color: 'text-indigo-600', bgColor: 'bg-indigo-600', cuenta: '', tipoCuenta: '', image: '/images/banks/zelle.jpeg' },
    { id: 'cashapp', nombre: 'Cash App', shortName: 'CA', color: 'text-green-500', bgColor: 'bg-green-500', cuenta: '', tipoCuenta: '', image: '/images/banks/cashapp.jpeg' },
    { id: 'apopular', nombre: 'Asociación Popular', shortName: 'AP', color: 'text-yellow-600', bgColor: 'bg-yellow-600', cuenta: '1036509737', tipoCuenta: 'Cuenta de Ahorro', image: '/images/banks/apopular.jpeg' },
  ]

  const titular = {
    nombre: 'Moisés Samuel Escaño Bravo',
    cedula: '402-3305853-2',
  }
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    telefono: '',
    email: '',
    banco: '',
    comprobante: null,
    comprobanteUrl: '',
  })
  const [ticketNumbers, setTicketNumbers] = useState<string[]>([])
  const [compraId, setCompraId] = useState('')
  const [qrValue, setQrValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showImageMenu, setShowImageMenu] = useState(false)
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const precioActual = moneda === 'DOP' ? precioBoleto : precioBoletoUsd
  const total = quantity * precioActual

  useEffect(() => {
    // Fetch config
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setPrecioBoleto(data.precio_boleto_dop)
        setPrecioBoletoUsd(data.precio_boleto_usd || 20)
      })
      .catch(console.error)

    // Fetch bancos
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes PNG, JPG o WEBP')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo excede el tamaño máximo de 10MB')
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
    if (!formData.comprobanteUrl) {
      toast.error('Por favor sube el comprobante de pago')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: quantity,
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
      // Extract ticket numbers from the new system
      const tickets = compra.tickets || []
      setTicketNumbers(tickets.map((t: { numero_boleto: string }) => t.numero_boleto))
      setCompraId(compra.id)
      setQrValue(compra.qr_code?.qr_value || '')
      setStep(4)
      toast.success('¡Compra registrada exitosamente!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar la compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyTicketNumbers = () => {
    const text = ticketNumbers.map(n => n.padStart(6, '0')).join(', ')
    navigator.clipboard.writeText(text)
    toast.success(ticketNumbers.length > 1 ? '¡Números de boletos copiados!' : '¡Número de boleto copiado!')
  }

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-2">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              s < step
                ? 'border-green-500 bg-green-500 text-white'
                : s === step
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            {s < step ? <Check className="h-5 w-5" /> : s}
          </div>
          {s < 4 && (
            <div
              className={`mx-2 h-0.5 w-8 ${
                s < step ? 'bg-green-500' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderOrderSummary = () => (
    <Card className="mb-6 border-border/50 bg-card/50">
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
  )

  // Step 1: Buyer Data
  if (step === 1) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {renderStepIndicator()}
        {renderOrderSummary()}

        <Card className="border-border/50 bg-card/50">
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
                  placeholder="Ej. Juan Pérez"
                  className="bg-input"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <span className="text-primary">📞</span>
                  Número de Celular <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej. +1 809-555-1234"
                  className="bg-input"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Ingresa tu número con código de país (ej. +1, +52, +34)
                </p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <span className="text-primary">@</span>
                  Correo Electrónico <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej. juan@correo.com"
                  className="bg-input"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.nombre || !formData.telefono}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: Payment Method
  if (step === 2) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {renderStepIndicator()}
        {renderOrderSummary()}

        <h2 className="mb-2 text-center text-2xl font-bold text-primary">MODOS DE PAGO</h2>
        <p className="mb-4 text-center text-muted-foreground">Elige una opción.</p>

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
              USD (Dólares)
            </Button>
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {moneda === 'DOP' 
              ? `RD$ ${new Intl.NumberFormat('es-DO').format(precioBoleto)} por boleto`
              : `US$ ${precioBoletoUsd} por boleto`
            }
          </p>
        </div>

        {/* Cash payment button */}
        <div className="relative mb-6 flex flex-col items-center">
          <p className="mb-2 text-center text-sm font-semibold text-primary" style={{ textShadow: '0 0 10px rgba(218, 165, 32, 0.6)' }}>
            Para pago en efectivo presione aquí
          </p>
          <button
            onClick={() => setShowCashPanel(!showCashPanel)}
            className={`overflow-hidden rounded-xl border-2 transition-all hover:shadow-lg hover:shadow-primary/30 ${
              showCashPanel ? 'border-primary shadow-lg shadow-primary/30' : 'border-primary/50 hover:border-primary'
            }`}
          >
            <Image
              src="/images/banks/payment-header.jpeg"
              alt="Pago en Efectivo"
              width={280}
              height={110}
              className="h-24 w-56 object-cover"
            />
          </button>

          {/* Cash info panel */}
          {showCashPanel && (
            <Card className="mt-3 w-full border-primary/30 bg-card/90">
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-semibold text-primary">Pago en Efectivo</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Si no tienes cuenta de banco y tienes tu dinero en efectivo, puedes dirigirte al banco o subagente más cercano y depositar solo con tu cédula.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Si es depósito bancario vía cajero sin importar la hora, específicamente <span className="font-semibold text-foreground">Banco Popular</span> te permite hacerlo sin tarjeta.
                </p>
                <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm font-medium leading-relaxed text-primary">
                  Una vez realizado el pago, deberá subir el comprobante seleccionando el banco donde realizó el depósito en los métodos de pago de abajo.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {paymentMethods.map((method) => (
            <div key={method.id}>
              <Card
                className={`cursor-pointer border-2 transition-all ${
                  expandedBanco === method.id
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-border/50 bg-card/50 hover:border-primary/50'
                }`}
                onClick={() => {
                  setExpandedBanco(expandedBanco === method.id ? null : method.id)
                  setSelectedBanco({ id: method.id, nombre: method.nombre, cuenta: method.cuenta || '' } as Banco)
                  setFormData(prev => ({ ...prev, banco: method.nombre }))
                }}
              >
                <CardContent className="flex flex-col items-center p-3">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-white">
                    <Image
                      src={method.image}
                      alt={method.nombre}
                      width={56}
                      height={56}
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                  <p className="text-center text-xs font-medium">{method.nombre}</p>
                </CardContent>
              </Card>

              {/* Payment Info Dropdown */}
              {expandedBanco === method.id && (
                <Card className="mt-2 border-primary/30 bg-card/80">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titular:</span>
                        <span className="font-medium text-foreground">{titular.nombre}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cédula:</span>
                        <span className="font-medium text-foreground">{titular.cedula}</span>
                      </div>
                      {method.cuenta && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipo:</span>
                            <span className="font-medium text-foreground">{method.tipoCuenta}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cuenta:</span>
                            <span className="font-bold text-primary">{method.cuenta}</span>
                          </div>
                        </>
                      )}
                      {method.tipoCuenta && !method.cuenta && !method.isPaypal && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span className="font-medium text-foreground">{method.tipoCuenta}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monto:</span>
                        <span className="font-bold text-primary">{formatCurrency(total)}</span>
                      </div>
                      {method.isPaypal && (
                        <a
                          href={`${method.paypalLink}/${moneda === 'USD' ? total : precioBoletoUsd * quantity}USD`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-3 font-medium text-white transition-colors hover:bg-blue-600"
                        >
                          Pagar con PayPal
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>

        <Card className="mb-6 border-green-500/50 bg-green-500/10">
          <CardContent className="flex items-start gap-3 p-4">
            <Check className="mt-0.5 h-5 w-5 text-green-500" />
            <p className="text-sm">
              Asegúrese de transferir el monto exacto. Después de realizar la
              transferencia, presione continuar para subir el comprobante.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!selectedBanco}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Ya transferí, subir comprobante <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Upload Receipt
  if (step === 3) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {renderStepIndicator()}

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Subir Comprobante de Pago</h2>
              <p className="text-center text-sm text-muted-foreground">
                Sube una foto o captura de pantalla del comprobante de la
                transferencia bancaria.
              </p>
            </div>

            <Card className="mb-6 border-border/50 bg-secondary/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                    <Image
                      src={paymentMethods.find(m => m.nombre === selectedBanco?.nombre)?.image || '/images/banks/bhd.jpeg'}
                      alt={selectedBanco?.nombre || 'Banco'}
                      width={40}
                      height={40}
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{selectedBanco?.nombre}</p>
                    {selectedBanco?.cuenta && (
                      <p className="text-sm text-muted-foreground">
                        Cuenta: {selectedBanco?.cuenta}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">{formatCurrency(total)}</p>
              </CardContent>
            </Card>

            <div className="mb-6 relative">
              <div
                onClick={() => !formData.comprobante && !isUploading && setShowImageMenu(!showImageMenu)}
                className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
              >
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-center">
                  {formData.comprobante
                    ? formData.comprobante.name
                    : 'Toca aquí para subir tu comprobante'}
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, JPEG - Máximo 10 MB
                </p>
                {!formData.comprobante && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-primary text-primary"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowImageMenu(!showImageMenu)
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isUploading ? 'Subiendo...' : 'Seleccionar imagen'}
                  </Button>
                )}
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
                          <p className="font-medium">Cámara</p>
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
                          <p className="font-medium">Galería</p>
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
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
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

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.comprobanteUrl || isSubmitting}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Envío'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 4: Confirmation
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {renderStepIndicator()}
      {renderOrderSummary()}

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
                      # {num.padStart(6, '0')}
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
                Guarda {ticketNumbers.length > 1 ? 'estos números' : 'este número'} para verificar el estado de tu boleto
              </p>
            </CardContent>
          </Card>

          {/* Permanent Player QR Code */}
          {qrValue && (
            <Card className="mb-6 border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center p-6">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Tu QR permanente de jugador</p>
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/jugador/${qrValue}`}
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
              onClick={onClose}
              className="flex-1 border-primary text-primary"
            >
              Volver al inicio
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

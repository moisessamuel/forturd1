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
import { Gift, Upload, DollarSign, Phone, User, Mail, CheckCircle, PartyPopper, X } from 'lucide-react'
import Image from 'next/image'

interface Premio {
  id: string
  nombre: string
  tipo: 'premio' | 'sin_premio'
  probabilidad: number
  descripcion: string
}

interface Banco {
  id: string
  nombre: string
  cuenta: string
  tipo: string
  titular: string
  logo_url: string
}

const PRECIO_GIRO_DOP = 200
const PRECIO_GIRO_USD = 4

export default function RuletaPage() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [bancos, setBancos] = useState<Banco[]>([])
  const [loading, setLoading] = useState(true)
  
  // Purchase flow state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [moneda, setMoneda] = useState<'DOP' | 'USD'>('DOP')
  const [selectedBanco, setSelectedBanco] = useState<Banco | null>(null)
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

  useEffect(() => {
    Promise.all([
      fetch('/api/ruleta').then(r => r.json()),
      fetch('/api/bancos').then(r => r.json()),
    ])
      .then(([premiosData, bancosData]) => {
        setPremios(premiosData)
        setBancos(bancosData)
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
    if (!formData.nombre || !formData.telefono || !selectedBanco || !comprobanteUrl) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/ruleta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          telefono: formData.telefono,
          email: formData.email,
          monto: moneda === 'DOP' ? PRECIO_GIRO_DOP : PRECIO_GIRO_USD,
          moneda,
          metodo_pago: selectedBanco.nombre,
          comprobante_url: comprobanteUrl,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setJugadaId(data.jugada_id)
        setPurchaseComplete(true)
        // For now, allow spinning after purchase (admin will confirm later)
        setCanSpin(true)
        setShowPurchaseModal(false)
      }
    } catch (error) {
      console.error('Purchase error:', error)
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

  const filteredBancos = moneda === 'USD' 
    ? bancos.filter(b => ['Zelle', 'Cash App', 'PayPal'].includes(b.nombre))
    : bancos.filter(b => !['Zelle', 'Cash App', 'PayPal'].includes(b.nombre))

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

        {/* Buy spin button */}
        {!canSpin && !purchaseComplete && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowPurchaseModal(true)}
              className="h-14 w-72 bg-gradient-to-r from-green-600 to-green-500 text-lg font-bold hover:from-green-500 hover:to-green-400"
            >
              <Gift className="mr-2 h-5 w-5" />
              COMPRAR GIRO
            </Button>
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
                {filteredBancos.map((banco) => (
                  <button
                    key={banco.id}
                    onClick={() => setSelectedBanco(banco)}
                    className={`flex flex-col items-center rounded-lg border-2 p-3 transition-all ${
                      selectedBanco?.id === banco.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {banco.logo_url ? (
                      <Image
                        src={banco.logo_url}
                        alt={banco.nombre}
                        width={40}
                        height={40}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <DollarSign className="h-8 w-8 text-primary" />
                    )}
                    <span className="mt-1 text-xs">{banco.nombre}</span>
                  </button>
                ))}
              </div>

              {selectedBanco && (
                <Card className="mt-4 border-primary/30 bg-primary/5">
                  <CardContent className="p-4 text-center text-sm">
                    <p className="font-bold">{selectedBanco.nombre}</p>
                    <p>{selectedBanco.tipo}: {selectedBanco.cuenta}</p>
                    <p className="text-muted-foreground">{selectedBanco.titular}</p>
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
              disabled={!formData.nombre || !formData.telefono || !selectedBanco || !comprobanteUrl || submitting}
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

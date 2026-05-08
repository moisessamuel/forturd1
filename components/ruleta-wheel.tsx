'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import Image from 'next/image'

interface Premio {
  id: string
  nombre: string
  tipo: 'premio' | 'sin_premio'
  probabilidad: number
}

interface RuletaWheelProps {
  premios: Premio[]
  onSpinComplete: (premio: Premio) => void
  canSpin: boolean
  isSpinning: boolean
  onStartSpin: () => void
  playerTelefono?: string
  playerNombre?: string
  jugadaId?: string
  spinType?: 'pagado' | 'gratis' | 'boleto'
  spinMonto?: number
  spinMoneda?: 'DOP' | 'USD'
}

// ─── CONFIGURACION VISUAL DE LA RULETA ─────────────────────────────────────
// 20 segmentos: 4 dorados (regalo) en posiciones 4, 9, 14, 19
// Los demas son negros con "SIGUE INTENTANDO"
// ──────────────────────────────────────────────────────────────────────────
const TOTAL_SEGMENTS = 20
const SEGMENT_ANGLE = 360 / TOTAL_SEGMENTS // 18 grados

// Indices de los segmentos dorados (regalo)
const GIFT_INDEXES = [4, 9, 14, 19]
// Indices de los segmentos "Sigue Intentando"
const LOSE_INDEXES = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]

// Determinar si un indice es regalo o no
function isGiftIndex(index: number): boolean {
  return GIFT_INDEXES.includes(index)
}

export function RuletaWheel({ 
  premios, 
  onSpinComplete, 
  canSpin, 
  isSpinning,
  onStartSpin,
  playerTelefono = 'unknown',
  playerNombre,
  jugadaId,
  spinType = 'pagado',
  spinMonto = 0,
  spinMoneda = 'DOP'
}: RuletaWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const logoRef = useRef<HTMLImageElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Cargar logo
  useEffect(() => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      logoRef.current = img
      setLogoLoaded(true)
    }
    img.src = '/images/forturd-logo.jpeg'
  }, [])

  // Dibujar la ruleta
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 20

    ctx.clearRect(0, 0, size, size)

    // Luces decorativas exteriores
    const lightCount = 36
    for (let i = 0; i < lightCount; i++) {
      const lightAngle = (i / lightCount) * Math.PI * 2 - Math.PI / 2
      const lightX = centerX + Math.cos(lightAngle) * (radius + 12)
      const lightY = centerY + Math.sin(lightAngle) * (radius + 12)
      
      const glowGradient = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 8)
      const isLit = isAnimating ? Math.random() > 0.3 : i % 2 === 0
      if (isLit) {
        glowGradient.addColorStop(0, 'rgba(255, 215, 0, 1)')
        glowGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)')
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)')
      } else {
        glowGradient.addColorStop(0, 'rgba(139, 117, 0, 0.8)')
        glowGradient.addColorStop(1, 'rgba(139, 117, 0, 0)')
      }
      
      ctx.beginPath()
      ctx.arc(lightX, lightY, 6, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
    }

    // Anillo dorado exterior
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2)
    const ringGradient = ctx.createLinearGradient(0, 0, size, size)
    ringGradient.addColorStop(0, '#FFD700')
    ringGradient.addColorStop(0.3, '#DAA520')
    ringGradient.addColorStop(0.5, '#FFD700')
    ringGradient.addColorStop(0.7, '#B8860B')
    ringGradient.addColorStop(1, '#FFD700')
    ctx.strokeStyle = ringGradient
    ctx.lineWidth = 10
    ctx.stroke()

    // Dibujar segmentos
    const startAngle = (rotation * Math.PI) / 180
    
    for (let index = 0; index < TOTAL_SEGMENTS; index++) {
      const isGift = isGiftIndex(index)
      const angle = (2 * Math.PI) / TOTAL_SEGMENTS
      const segmentStart = startAngle + index * angle - Math.PI / 2
      const segmentEnd = segmentStart + angle

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius - 5, segmentStart, segmentEnd)
      ctx.closePath()

      if (isGift) {
        const goldGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        goldGradient.addColorStop(0, '#FFE55C')
        goldGradient.addColorStop(0.5, '#DAA520')
        goldGradient.addColorStop(1, '#B8860B')
        ctx.fillStyle = goldGradient
      } else {
        const darkGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        darkGradient.addColorStop(0, '#2a2a2a')
        darkGradient.addColorStop(1, '#0a0a0a')
        ctx.fillStyle = darkGradient
      }
      ctx.fill()

      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.stroke()

      // Contenido del segmento
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(segmentStart + angle / 2)
      
      const textRadius = radius * 0.68
      
      if (isGift) {
        // Caja de regalo
        const boxSize = size < 400 ? 24 : 30
        
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + 5, boxSize, boxSize * 0.7)
        ctx.fillRect(textRadius - boxSize/2 - 3, -boxSize/2, boxSize + 6, boxSize * 0.28)
        
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(textRadius - 3, -boxSize/2, 6, boxSize * 0.98)
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + boxSize * 0.38, boxSize, 5)
        
        ctx.beginPath()
        ctx.arc(textRadius - 7, -boxSize/2 - 3, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(textRadius + 7, -boxSize/2 - 3, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(textRadius, -boxSize/2 - 1, 4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Texto "SIGUE INTENTANDO"
        const fontSize = size < 400 ? 7 : 9
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = '#DAA520'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('SIGUE', textRadius, -5)
        ctx.fillText('INTENTANDO', textRadius, 5)
      }
      
      ctx.restore()
    }

    // Centro de la ruleta
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.32, 0, Math.PI * 2)
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.32)
    centerGradient.addColorStop(0, '#FFD700')
    centerGradient.addColorStop(0.7, '#DAA520')
    centerGradient.addColorStop(1, '#B8860B')
    ctx.fillStyle = centerGradient
    ctx.fill()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 4
    ctx.stroke()

    // Logo
    if (logoLoaded && logoRef.current) {
      const logoSize = radius * 0.55
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.28, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(logoRef.current, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize)
      ctx.restore()
    }

  }, [rotation, isAnimating, logoLoaded])

  // ─── LOGICA SIMPLE DE PREMIOS ─────────────────────────────────────────────
  // Si el numero de giro es multiplo exacto del ciclo → PREMIO (caer en regalo)
  // Si no → SIGUE INTENTANDO (caer en negro)
  // ──────────────────────────────────────────────────────────────────────────
  const determineResult = useCallback(async (): Promise<{ isWin: boolean; prizeName: string }> => {
    // Obtener el conteo actual de giros
    let currentCount = 0
    try {
      const res = await fetch('/api/ruleta/spin-count')
      const data = await res.json()
      currentCount = data.count || 0
    } catch {
      currentCount = 0
    }

    // Este sera el giro numero:
    const thisSpinNumber = currentCount + 1

    // ─── PREMIOS EXACTOS POR MODULO ─────────────────────────────────────────
    // Orden de prioridad: del mas raro al mas comun
    // ────────────────────────────────────────────────────────────────────────
    if (thisSpinNumber % 16207 === 0) {
      return { isWin: true, prizeName: 'Motor' }
    }
    if (thisSpinNumber % 12506 === 0) {
      return { isWin: true, prizeName: 'RD$100,000' }
    }
    if (thisSpinNumber % 8605 === 0) {
      return { isWin: true, prizeName: 'iPhone' }
    }
    if (thisSpinNumber % 3504 === 0) {
      const techPrizes = ['Patineta Electrica', 'PS5', 'Smart TV']
      return { isWin: true, prizeName: techPrizes[Math.floor(Math.random() * techPrizes.length)] }
    }
    if (thisSpinNumber % 211 === 0) {
      return { isWin: true, prizeName: 'RD$5,000' }
    }
    if (thisSpinNumber % 71 === 0) {
      return { isWin: true, prizeName: '1 Boleto BMW X6 + 1 Boleto BMW X7' }
    }
    if (thisSpinNumber % 20 === 0) {
      return { isWin: true, prizeName: '1 Boleto del Sorteo a Eleccion' }
    }

    // No es multiplo de ningun premio → Sigue Intentando
    return { isWin: false, prizeName: 'Sigue Intentando' }
  }, [])

  // ─── ANIMACION SIMPLE Y ESTABLE ─────────────────────────────────────────────
  const spinWheel = useCallback(async () => {
    if (!canSpin || isSpinning || isAnimating) return

    onStartSpin()
    setIsAnimating(true)

    // Determinar resultado ANTES de animar
    const { isWin, prizeName } = await determineResult()

    // Seleccionar indice del segmento donde caer
    const targetIndex = isWin
      ? GIFT_INDEXES[Math.floor(Math.random() * GIFT_INDEXES.length)]
      : LOSE_INDEXES[Math.floor(Math.random() * LOSE_INDEXES.length)]

    // Calcular rotacion final para que el segmento quede arriba (bajo el puntero)
    // El puntero esta en la posicion "top" (270 grados en coordenadas estandar)
    // Cada segmento ocupa 18 grados
    // Segmento 0 empieza en -90 grados (top) cuando rotation = 0
    // Para centrar el segmento i bajo el puntero:
    // rotation = -i * 18 + 9 (el +9 es para centrar, no el borde)
    // Normalizado a positivo: rotation = 360 - i * 18 + 9 = 369 - i * 18
    
    const baseRotation = (369 - targetIndex * SEGMENT_ANGLE) % 360
    
    // Agregar vueltas completas para efecto visual (5-7 vueltas)
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3))
    const finalRotation = rotation + extraSpins + baseRotation - (rotation % 360)
    
    // Duracion de la animacion
    const duration = 6000

    const startRotation = rotation
    const totalSpin = finalRotation - startRotation
    const startTime = performance.now()

    // Easing: rapido al inicio, lento al final
    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 4)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOut(progress)

      setRotation(startRotation + totalSpin * easedProgress)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Snap final exacto
        setRotation(finalRotation)
        setIsAnimating(false)

        // Efectos de victoria
        if (isWin) {
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 3000)
        }

        // Registrar el giro
        fetch('/api/ruleta/spin-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: playerTelefono,
            nombre: playerNombre,
            tipo: spinType,
            resultado: prizeName,
            es_premio: isWin,
            jugada_id: jugadaId,
            monto: spinMonto,
            moneda: spinMoneda
          })
        }).catch(console.error)

        // Notificar resultado
        const premio: Premio = isWin
          ? { id: 'prize', nombre: prizeName, tipo: 'premio', probabilidad: 1 }
          : { id: 'no-prize', nombre: 'Sigue Intentando', tipo: 'sin_premio', probabilidad: 100 }

        onSpinComplete(premio)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [canSpin, isSpinning, isAnimating, onStartSpin, determineResult, rotation, playerTelefono, playerNombre, spinType, jugadaId, spinMonto, spinMoneda, onSpinComplete])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const wheelSize = typeof window !== 'undefined' && window.innerWidth < 400 ? 340 : 420

  return (
    <div className="relative flex flex-col items-center">
      {/* Efecto de brillo */}
      <div 
        className="absolute inset-0 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(218,165,32,0.4) 0%, transparent 70%)',
          transform: 'scale(1.2)',
        }}
      />

      <div className="relative">
        {/* Puntero superior */}
        <div 
          className="absolute left-1/2 -top-2 z-20 -translate-x-1/2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(218,165,32,0.8))' }}
        >
          <div 
            className="h-0 w-0"
            style={{
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderTop: '35px solid #FFD700',
            }}
          />
        </div>

        {/* Canvas de la ruleta */}
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          className="relative z-10 cursor-pointer"
          onClick={() => canSpin && !isSpinning && !isAnimating && spinWheel()}
          style={{
            width: `min(${wheelSize}px, 90vw)`,
            height: `min(${wheelSize}px, 90vw)`,
          }}
        />

        {/* Logo central */}
        <div 
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none"
          style={{
            width: `${wheelSize * 0.28}px`,
            height: `${wheelSize * 0.28}px`,
          }}
        >
          <Image
            src="/images/forturd-logo.jpeg"
            alt="FortuRD"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Particulas de victoria */}
        {showParticles && (
          <div className="pointer-events-none absolute inset-0 z-30">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              >
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Efecto de pedestal */}
      <div className="mt-4 h-4 w-72 rounded-full bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent blur-sm" />
    </div>
  )
}

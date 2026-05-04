'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

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
}

// Prize segments configuration - alternating gold/black with "SIGUE INTENTANDO" and gift boxes
// Gift boxes (isGiftBox: true) are triggers for prizes based on global counter
const WHEEL_SEGMENTS = [
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo1' },
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo2' },
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo3' },
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo4' },
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo5' },
  { label: 'SIGUE\nINTENTANDO', color: '#1a1a1a', textColor: '#DAA520', tipo: 'sin_premio', isGiftBox: false },
  { label: '', color: '#DAA520', textColor: '#000000', tipo: 'premio', isGiftBox: true, premioKey: 'regalo6' },
]

const TOTAL_SEGMENTS = WHEEL_SEGMENTS.length
const SEGMENT_ANGLE = 360 / TOTAL_SEGMENTS

export function RuletaWheel({ 
  premios, 
  onSpinComplete, 
  canSpin, 
  isSpinning,
  onStartSpin 
}: RuletaWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [pulseButton, setPulseButton] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [globalSpinCount, setGlobalSpinCount] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)

  // Fetch global spin count
  useEffect(() => {
    fetch('/api/ruleta/spin-count')
      .then(r => r.json())
      .then(data => {
        if (data.count !== undefined) {
          setGlobalSpinCount(data.count)
        }
      })
      .catch(console.error)
  }, [])

  // Pulsing animation for button when can spin
  useEffect(() => {
    if (canSpin && !isSpinning) {
      const interval = setInterval(() => {
        setPulseButton(prev => !prev)
      }, 800)
      return () => clearInterval(interval)
    }
  }, [canSpin, isSpinning])

  // Draw the wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw outer ring glow
    const gradient = ctx.createRadialGradient(centerX, centerY, radius - 20, centerX, centerY, radius + 10)
    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(0.8, 'rgba(218, 165, 32, 0.3)')
    gradient.addColorStop(1, 'rgba(218, 165, 32, 0.1)')
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw segments
    const startAngle = (rotation * Math.PI) / 180
    
    WHEEL_SEGMENTS.forEach((segment, index) => {
      const angle = (2 * Math.PI) / TOTAL_SEGMENTS
      const segmentStart = startAngle + index * angle - Math.PI / 2
      const segmentEnd = segmentStart + angle

      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius - 5, segmentStart, segmentEnd)
      ctx.closePath()

      // Gradient fill for segments
      const midAngle = segmentStart + angle / 2
      const gradientX = centerX + Math.cos(midAngle) * radius * 0.5
      const gradientY = centerY + Math.sin(midAngle) * radius * 0.5
      const segGradient = ctx.createRadialGradient(centerX, centerY, 0, gradientX, gradientY, radius)
      
      if (segment.tipo === 'sin_premio') {
        segGradient.addColorStop(0, '#2a2a2a')
        segGradient.addColorStop(1, segment.color)
      } else {
        segGradient.addColorStop(0, lightenColor(segment.color, 30))
        segGradient.addColorStop(1, segment.color)
      }
      
      ctx.fillStyle = segGradient
      ctx.fill()

      // Draw segment border
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw text or gift box
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(segmentStart + angle / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const textRadius = radius * 0.65
      
      if (segment.isGiftBox) {
        // Draw gift box icon
        const boxSize = size < 350 ? 24 : 32
        const boxX = textRadius - boxSize / 2
        const boxY = -boxSize / 2
        
        // Gift box body
        ctx.fillStyle = '#FF4444'
        ctx.fillRect(boxX, boxY + boxSize * 0.3, boxSize, boxSize * 0.7)
        
        // Gift box lid
        ctx.fillStyle = '#FF6666'
        ctx.fillRect(boxX - 2, boxY + boxSize * 0.2, boxSize + 4, boxSize * 0.15)
        
        // Ribbon vertical
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(boxX + boxSize * 0.4, boxY + boxSize * 0.3, boxSize * 0.2, boxSize * 0.7)
        
        // Ribbon horizontal
        ctx.fillRect(boxX, boxY + boxSize * 0.55, boxSize, boxSize * 0.15)
        
        // Bow
        ctx.beginPath()
        ctx.arc(boxX + boxSize * 0.35, boxY + boxSize * 0.15, boxSize * 0.12, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(boxX + boxSize * 0.65, boxY + boxSize * 0.15, boxSize * 0.12, 0, Math.PI * 2)
        ctx.fill()
        
        // Sparkles around gift
        ctx.fillStyle = '#FFFFFF'
        ctx.font = `${size < 350 ? 8 : 10}px Arial`
        ctx.fillText('✦', boxX - 5, boxY)
        ctx.fillText('✦', boxX + boxSize + 5, boxY + boxSize * 0.5)
        ctx.fillText('✦', boxX + boxSize * 0.5, boxY - 5)
      } else {
        // Draw text
        const fontSize = size < 350 ? 9 : 11
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = segment.textColor
        
        // Handle multiline text
        const lines = segment.label.split('\n')
        const lineHeight = fontSize + 2
        
        lines.forEach((line, lineIndex) => {
          const yOffset = (lineIndex - (lines.length - 1) / 2) * lineHeight
          ctx.fillText(line, textRadius, yOffset)
        })
      }
      
      ctx.restore()
    })

    // Draw center circle
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50)
    centerGradient.addColorStop(0, '#FFD700')
    centerGradient.addColorStop(0.5, '#DAA520')
    centerGradient.addColorStop(1, '#B8860B')
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, 45, 0, Math.PI * 2)
    ctx.fillStyle = centerGradient
    ctx.fill()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw center logo text
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FortuRD', centerX, centerY - 5)
    ctx.font = 'bold 10px Arial'
    ctx.fillText('GIRA', centerX, centerY + 10)

    // Draw outer ring with lights
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#DAA520'
    ctx.lineWidth = 8
    ctx.stroke()

    // Draw decorative lights around the wheel
    const lightCount = 24
    for (let i = 0; i < lightCount; i++) {
      const lightAngle = (i / lightCount) * Math.PI * 2 + startAngle
      const lightX = centerX + Math.cos(lightAngle) * (radius + 2)
      const lightY = centerY + Math.sin(lightAngle) * (radius + 2)
      
      ctx.beginPath()
      ctx.arc(lightX, lightY, 4, 0, Math.PI * 2)
      
      // Alternate light colors and add blinking effect
      const isLit = isAnimating ? Math.random() > 0.3 : i % 2 === 0
      ctx.fillStyle = isLit ? '#FFD700' : '#8B7500'
      ctx.fill()
    }

  }, [rotation, isAnimating])

  // Helper function to lighten colors
  function lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1)
  }

  // Initialize Audio Context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play tick sound
  const playTickSound = useCallback(() => {
    try {
      const ctx = initAudio()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = 800 + Math.random() * 200
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.03)
    } catch {
      // Audio not available
    }
  }, [initAudio])

  // Play win sound
  const playWinSound = useCallback(() => {
    try {
      const ctx = initAudio()
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        
        const startTime = ctx.currentTime + i * 0.12
        gainNode.gain.setValueAtTime(0.15, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.25)
      })
    } catch {
      // Audio not available
    }
  }, [initAudio])

  // Determine prize based on controlled probability (global spin counter)
  // LOGIC:
  // - By default, ALWAYS "Sigue Intentando"
  // - If lands on gift box AND matches milestone, give the corresponding prize
  // - Gift boxes that don't match any milestone = "Sigue Intentando"
  //
  // Milestones:
  // - Every 201 spins -> 1 Boleto BMW (X6 + X7)
  // - Every 753 spins -> RD$5,000
  // - Every 3,504 spins -> Patineta/PS5/Smart TV (random)
  // - Every 7,605 spins -> iPhone
  // - Every 12,506 spins -> Motor
  const determinePrize = useCallback(async (): Promise<{ premio: Premio; targetSegment: number; actualPrize: string | null }> => {
    const nextSpinCount = globalSpinCount + 1
    
    // Check controlled probability milestones (check from rarest to most common)
    let prizeType: string | null = null
    let prizeName: string = 'Sigue Intentando'
    
    // Every 12,506 spins -> Motor
    if (nextSpinCount % 12506 === 0) {
      prizeType = 'motor'
      prizeName = 'Motor'
    }
    // Every 7,605 spins -> iPhone
    else if (nextSpinCount % 7605 === 0) {
      prizeType = 'iphone'
      prizeName = 'iPhone'
    }
    // Every 3,504 spins -> Patineta/PS5/Smart TV (random)
    else if (nextSpinCount % 3504 === 0) {
      prizeType = 'tech'
      const techPrizes = ['Patineta Electrica', 'PS5', 'Smart TV']
      prizeName = techPrizes[Math.floor(Math.random() * techPrizes.length)]
    }
    // Every 753 spins -> RD$5,000
    else if (nextSpinCount % 753 === 0) {
      prizeType = 'dinero'
      prizeName = 'RD$5,000'
    }
    // Every 201 spins -> 1 Boleto BMW
    else if (nextSpinCount % 201 === 0) {
      prizeType = 'boleto'
      prizeName = '1 Boleto BMW X6 + 1 Boleto BMW X7'
    }
    
    // Find the target segment
    let targetSegment: number
    
    if (prizeType) {
      // Prize milestone - land on a random gift box segment
      const giftBoxSegments = WHEEL_SEGMENTS
        .map((s, i) => ({ ...s, index: i }))
        .filter(s => s.isGiftBox)
      targetSegment = giftBoxSegments[Math.floor(Math.random() * giftBoxSegments.length)].index
    } else {
      // No prize - land on a "SIGUE INTENTANDO" segment
      const noWinSegments = WHEEL_SEGMENTS
        .map((s, i) => ({ ...s, index: i }))
        .filter(s => !s.isGiftBox)
      targetSegment = noWinSegments[Math.floor(Math.random() * noWinSegments.length)].index
    }

    // Create the premio object
    let premio: Premio
    
    if (prizeType) {
      // Find matching premio from database or create one
      premio = premios.find(p => 
        p.tipo === 'premio' && 
        p.nombre.toLowerCase().includes(prizeType!.toLowerCase())
      ) || {
        id: 'prize-' + prizeType,
        nombre: prizeName,
        tipo: 'premio' as const,
        probabilidad: 1
      }
      // Override the name with the actual prize
      premio = { ...premio, nombre: prizeName }
    } else {
      // "Sigue Intentando"
      premio = premios.find(p => p.tipo === 'sin_premio') || {
        id: 'no-prize',
        nombre: 'Sigue Intentando',
        tipo: 'sin_premio' as const,
        probabilidad: 100
      }
    }

    return { premio, targetSegment, actualPrize: prizeType ? prizeName : null }
  }, [premios, globalSpinCount])

  // Animate the wheel spin with easing
  const spinWheel = useCallback(async () => {
    if (!canSpin || isSpinning || isAnimating) return

    onStartSpin()
    setIsAnimating(true)
    initAudio()

    const { premio, targetSegment } = await determinePrize()
    const isWin = premio.tipo === 'premio'

    // Calculate final rotation
    const fullSpins = 5 + Math.floor(Math.random() * 3) // 5-7 full rotations
    const segmentMiddle = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    // Pointer is at top (0 degrees in our coordinate system)
    // We need to rotate so the target segment lands at the pointer
    const targetRotation = (fullSpins * 360) + (360 - segmentMiddle)
    
    const startRotation = rotation
    const totalRotation = targetRotation
    const duration = 6000 // 6 seconds
    const startTime = performance.now()

    // Easing function: ease-out cubic for smooth deceleration
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3)
    }

    // Animation loop
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      
      const currentRotation = startRotation + totalRotation * easedProgress
      setRotation(currentRotation % 360)

      // Play tick sounds based on speed
      const speed = (totalRotation / duration) * (1 - progress) * 1000
      if (speed > 50 && Math.random() > 0.7) {
        playTickSound()
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setIsAnimating(false)
        if (isWin) {
          playWinSound()
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 3000)
        }
        
        // Update global spin count (local state and API)
        setGlobalSpinCount(prev => prev + 1)
        
        // Persist to database
        fetch('/api/ruleta/spin-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(console.error)
        
        // Notify parent
        onSpinComplete(premio)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [canSpin, isSpinning, isAnimating, onStartSpin, determinePrize, rotation, playTickSound, playWinSound, onSpinComplete, initAudio])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const wheelSize = typeof window !== 'undefined' && window.innerWidth < 400 ? 320 : 400

  return (
    <div className="relative flex flex-col items-center">
      {/* Glow effect behind wheel */}
      <div 
        className="absolute inset-0 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(218,165,32,0.5) 0%, transparent 70%)',
          transform: 'scale(1.3)',
        }}
      />

      {/* Main wheel container */}
      <div className="relative">
        {/* Fixed pointer at top */}
        <div 
          className="absolute left-1/2 -top-4 z-20 -translate-x-1/2"
          style={{ filter: 'drop-shadow(0 0 15px rgba(218,165,32,1))' }}
        >
          <div 
            className="h-0 w-0"
            style={{
              borderLeft: '22px solid transparent',
              borderRight: '22px solid transparent',
              borderTop: '40px solid #FFD700',
            }}
          />
          <div 
            className="absolute left-1/2 top-1 h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '26px solid #DAA520',
            }}
          />
        </div>

        {/* Canvas wheel */}
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          className="relative z-10"
          style={{
            width: `min(${wheelSize}px, 90vw)`,
            height: `min(${wheelSize}px, 90vw)`,
          }}
        />

        {/* Sparkle particles on win */}
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

        {/* Light rays during spin */}
        {isAnimating && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-full">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-full w-1 origin-bottom -translate-x-1/2 bg-gradient-to-t from-transparent via-yellow-400/40 to-transparent"
                style={{
                  transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  animation: `pulse 0.3s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spin button */}
      <div className="mt-8">
        {canSpin && !isSpinning && !isAnimating ? (
          <Button
            onClick={spinWheel}
            className={`relative h-16 w-64 overflow-hidden bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-xl font-bold text-black transition-all hover:scale-105 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 ${
              pulseButton ? 'shadow-[0_0_40px_rgba(218,165,32,0.9)]' : 'shadow-[0_0_20px_rgba(218,165,32,0.6)]'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              GIRAR RULETA
              <Sparkles className="h-6 w-6" />
            </span>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                animation: 'shimmer 1.5s infinite',
                transform: 'translateX(-100%)',
              }}
            />
          </Button>
        ) : (isSpinning || isAnimating) ? (
          <div className="flex h-16 w-64 items-center justify-center rounded-md bg-primary/20 text-xl font-bold text-primary">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              GIRANDO...
            </div>
          </div>
        ) : (
          <div className="h-16 w-64 rounded-md bg-muted/50" />
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

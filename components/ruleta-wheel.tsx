'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Gift, Sparkles } from 'lucide-react'

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

const TOTAL_SEGMENTS = 20
const PRIZE_SEGMENTS = [0, 3, 6, 10, 13, 17] // 6 prize positions
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
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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
  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, size: number, currentRotation: number) => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 20
    const innerRadius = radius * 0.28

    ctx.clearRect(0, 0, size, size)
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((currentRotation * Math.PI) / 180)

    // Draw outer golden ring with lights
    const outerRingGradient = ctx.createRadialGradient(0, 0, radius - 10, 0, 0, radius + 10)
    outerRingGradient.addColorStop(0, '#8B6914')
    outerRingGradient.addColorStop(0.5, '#DAA520')
    outerRingGradient.addColorStop(1, '#8B6914')
    
    ctx.beginPath()
    ctx.arc(0, 0, radius + 8, 0, 2 * Math.PI)
    ctx.strokeStyle = outerRingGradient
    ctx.lineWidth = 16
    ctx.stroke()

    // Draw light bulbs around the ring
    const numLights = 32
    for (let i = 0; i < numLights; i++) {
      const angle = (i / numLights) * 2 * Math.PI
      const x = Math.cos(angle) * (radius + 8)
      const y = Math.sin(angle) * (radius + 8)
      
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FFF8DC'
      ctx.fill()
      
      // Add glow effect
      ctx.shadowColor = '#FFD700'
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Draw segments
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180)
      const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180)
      const isPrize = PRIZE_SEGMENTS.includes(i)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius - 8, startAngle, endAngle)
      ctx.closePath()

      // Gold or black segment
      if (isPrize) {
        const goldGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius)
        goldGradient.addColorStop(0, '#DAA520')
        goldGradient.addColorStop(0.5, '#FFD700')
        goldGradient.addColorStop(1, '#B8860B')
        ctx.fillStyle = goldGradient
      } else {
        const blackGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius)
        blackGradient.addColorStop(0, '#1a1a1a')
        blackGradient.addColorStop(1, '#000000')
        ctx.fillStyle = blackGradient
      }
      ctx.fill()

      // Segment border
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw content in segment
      ctx.save()
      const midAngle = ((i + 0.5) * SEGMENT_ANGLE - 90) * (Math.PI / 180)
      const textRadius = radius * 0.68
      
      ctx.rotate(midAngle)
      ctx.translate(textRadius, 0)
      ctx.rotate(Math.PI / 2)

      if (isPrize) {
        // Draw gift box icon
        ctx.fillStyle = '#FFFFFF'
        ctx.strokeStyle = '#DAA520'
        ctx.lineWidth = 2
        
        // Box body
        ctx.fillRect(-15, -10, 30, 24)
        ctx.strokeRect(-15, -10, 30, 24)
        
        // Ribbon vertical
        ctx.fillStyle = '#DAA520'
        ctx.fillRect(-3, -10, 6, 24)
        
        // Ribbon horizontal
        ctx.fillRect(-15, 0, 30, 5)
        
        // Bow
        ctx.beginPath()
        ctx.ellipse(-8, -14, 6, 4, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(8, -14, 6, 4, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, -12, 3, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        // Draw "SIGUE INTENTANDO" text
        ctx.fillStyle = '#DAA520'
        ctx.font = 'bold 8px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('SIGUE', 0, -4)
        ctx.fillText('INTENTANDO', 0, 6)
        
        // Stars
        ctx.font = '6px Arial'
        ctx.fillText('★ ★ ★', 0, 16)
      }

      ctx.restore()
    }

    // Draw inner golden ring
    const innerRingGradient = ctx.createRadialGradient(0, 0, innerRadius - 5, 0, 0, innerRadius + 5)
    innerRingGradient.addColorStop(0, '#8B6914')
    innerRingGradient.addColorStop(0.5, '#DAA520')
    innerRingGradient.addColorStop(1, '#8B6914')
    
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = innerRingGradient
    ctx.lineWidth = 8
    ctx.stroke()

    // Draw center circle (black background)
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius - 4, 0, 2 * Math.PI)
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius)
    centerGradient.addColorStop(0, '#1a1a1a')
    centerGradient.addColorStop(1, '#000000')
    ctx.fillStyle = centerGradient
    ctx.fill()

    // Draw FortuRD text in center
    ctx.rotate((-currentRotation * Math.PI) / 180) // Counter-rotate for text to stay upright
    
    ctx.fillStyle = '#DAA520'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Add glow to text
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 10
    ctx.fillText('FortuRD', 0, 0)
    ctx.shadowBlur = 0

    ctx.restore()

    // Draw pointer (arrow at top) - outside rotation
    ctx.save()
    ctx.translate(centerX, 15)
    
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-15, -25)
    ctx.lineTo(15, -25)
    ctx.closePath()
    
    const pointerGradient = ctx.createLinearGradient(0, -25, 0, 0)
    pointerGradient.addColorStop(0, '#DAA520')
    pointerGradient.addColorStop(0.5, '#FFD700')
    pointerGradient.addColorStop(1, '#DAA520')
    ctx.fillStyle = pointerGradient
    ctx.fill()
    
    ctx.strokeStyle = '#8B6914'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Pointer glow
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 15
    ctx.fill()
    ctx.shadowBlur = 0
    
    ctx.restore()
  }, [])

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width

    drawWheel(ctx, size, rotation)
  }, [rotation, drawWheel])

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const container = canvas.parentElement
      if (!container) return
      
      const size = Math.min(container.clientWidth, 500)
      canvas.width = size
      canvas.height = size
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawWheel(ctx, size, rotation)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [drawWheel, rotation])

  // Initialize audio context
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
      
      oscillator.frequency.value = 800 + Math.random() * 400
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.05)
    } catch {
      // Audio not supported
    }
  }, [initAudio])

  // Play win sound
  const playWinSound = useCallback(() => {
    try {
      const ctx = initAudio()
      const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        
        const startTime = ctx.currentTime + i * 0.15
        gainNode.gain.setValueAtTime(0.25, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.4)
      })
    } catch {
      // Audio not supported
    }
  }, [initAudio])

  // Animated spin with tick sounds
  const animateSpin = useCallback((targetRotation: number, duration: number, onComplete: () => void) => {
    const startRotation = rotation
    const startTime = performance.now()
    let lastTickAngle = startRotation

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for realistic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const currentRotation = startRotation + (targetRotation - startRotation) * easeOut
      
      // Play tick sound at segment boundaries
      const segmentsPassed = Math.floor(currentRotation / SEGMENT_ANGLE) - Math.floor(lastTickAngle / SEGMENT_ANGLE)
      if (segmentsPassed > 0 && progress < 0.95) {
        playTickSound()
      }
      lastTickAngle = currentRotation
      
      setRotation(currentRotation)
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        onComplete()
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [rotation, playTickSound])

  // Calculate prize based on weighted probability
  const selectPrizeByProbability = (): Premio => {
    const totalProbability = premios.reduce((sum, p) => sum + p.probabilidad, 0)
    let random = Math.random() * totalProbability
    
    for (const premio of premios) {
      random -= premio.probabilidad
      if (random <= 0) {
        return premio
      }
    }
    return premios[premios.length - 1]
  }

  // Get segment index based on prize type
  const getTargetSegment = (isPrize: boolean): number => {
    if (isPrize) {
      const randomIndex = Math.floor(Math.random() * PRIZE_SEGMENTS.length)
      return PRIZE_SEGMENTS[randomIndex]
    } else {
      // Get non-prize segments
      const noPrizeSegments = Array.from({ length: TOTAL_SEGMENTS }, (_, i) => i)
        .filter(i => !PRIZE_SEGMENTS.includes(i))
      const randomIndex = Math.floor(Math.random() * noPrizeSegments.length)
      return noPrizeSegments[randomIndex]
    }
  }

  const spinWheel = () => {
    if (!canSpin || isSpinning) return

    onStartSpin()
    
    // Select prize based on probability
    const prize = selectPrizeByProbability()
    const isPrize = prize.tipo === 'premio'
    
    // Get target segment
    const targetSegment = getTargetSegment(isPrize)
    const targetAngle = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    
    // Add multiple full rotations
    const currentTotal = rotation
    const spins = 8 + Math.floor(Math.random() * 4) // 8-11 full spins
    const finalRotation = currentTotal + (spins * 360) + (360 - targetAngle)
    
    // Animate the spin
    animateSpin(finalRotation, 6000, () => {
      if (isPrize) {
        setShowParticles(true)
        playWinSound()
        setTimeout(() => setShowParticles(false), 3000)
      }
      onSpinComplete(prize)
    })
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow effect */}
      <div 
        className="pointer-events-none absolute -inset-10 z-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(218,165,32,${isSpinning ? 0.4 : 0.2}) 0%, transparent 60%)`,
          transition: 'all 0.3s',
        }}
      />

      {/* Particle effects when winning */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 1}s`,
              }}
            >
              <Sparkles 
                className="text-yellow-400" 
                style={{ 
                  width: `${12 + Math.random() * 24}px`,
                  height: `${12 + Math.random() * 24}px`,
                  filter: 'drop-shadow(0 0 8px gold)',
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Light rays during spin */}
      {isSpinning && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-[350px] w-3 origin-bottom animate-pulse"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
                background: 'linear-gradient(to top, rgba(218,165,32,0.6), transparent)',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Wheel Container */}
      <div 
        className="relative w-full max-w-[500px]"
        style={{
          filter: isSpinning 
            ? 'drop-shadow(0 0 30px rgba(218,165,32,0.8))' 
            : 'drop-shadow(0 0 20px rgba(218,165,32,0.5))',
          transition: 'filter 0.3s',
        }}
      >
        <canvas
          ref={canvasRef}
          className="h-auto w-full cursor-pointer"
          onClick={spinWheel}
          style={{
            maxWidth: '500px',
            maxHeight: '500px',
          }}
        />
      </div>

      {/* Spin button */}
      <Button
        onClick={spinWheel}
        disabled={!canSpin || isSpinning}
        className={`mt-8 h-16 w-72 bg-gradient-to-r from-primary to-yellow-500 text-xl font-bold text-black transition-all hover:scale-105 hover:from-yellow-500 hover:to-primary disabled:opacity-50 ${
          canSpin && !isSpinning && pulseButton ? 'scale-105' : 'scale-100'
        }`}
        style={{
          boxShadow: canSpin && !isSpinning 
            ? `0 0 ${pulseButton ? 40 : 20}px rgba(218,165,32,${pulseButton ? 0.8 : 0.5})` 
            : 'none',
          transition: 'all 0.3s ease-in-out',
        }}
      >
        {isSpinning ? (
          <span className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-black border-t-transparent" />
            GIRANDO...
          </span>
        ) : (
          <span className="flex items-center gap-3">
            <Gift className="h-6 w-6" />
            {canSpin ? 'PRESIONA AQUI' : 'COMPRA PARA GIRAR'}
          </span>
        )}
      </Button>

      {/* Decorative sparkles around button when can spin */}
      {canSpin && !isSpinning && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
          {[...Array(8)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute animate-pulse text-yellow-400"
              style={{
                left: `${-100 + i * 28}px`,
                top: `${Math.sin(i) * 12 - 20}px`,
                animationDelay: `${i * 0.15}s`,
                opacity: 0.8,
              }}
              size={18}
            />
          ))}
        </div>
      )}
    </div>
  )
}

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
}

// 20 segments: 10 black "SIGUE INTENTANDO" alternating with 10 gold "gift box"
const WHEEL_SEGMENTS: Array<{
  label: string
  color: string
  textColor: string
  tipo: string
  isGiftBox: boolean
}> = []

// Generate 20 alternating segments
for (let i = 0; i < 20; i++) {
  if (i % 2 === 0) {
    // Black segment with "SIGUE INTENTANDO"
    WHEEL_SEGMENTS.push({
      label: 'SIGUE\nINTENTANDO',
      color: '#1a1a1a',
      textColor: '#DAA520',
      tipo: 'sin_premio',
      isGiftBox: false,
    })
  } else {
    // Gold segment with gift box
    WHEEL_SEGMENTS.push({
      label: '',
      color: '#DAA520',
      textColor: '#000000',
      tipo: 'premio',
      isGiftBox: true,
    })
  }
}

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
  const [isAnimating, setIsAnimating] = useState(false)
  const [globalSpinCount, setGlobalSpinCount] = useState(0)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const logoRef = useRef<HTMLImageElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)

  // Load the logo image
  useEffect(() => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      logoRef.current = img
      setLogoLoaded(true)
    }
    img.src = '/images/forturd-logo.jpeg'
  }, [])

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

  // Draw the wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 20

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw outer decorative ring with lights
    const lightCount = 36
    for (let i = 0; i < lightCount; i++) {
      const lightAngle = (i / lightCount) * Math.PI * 2 - Math.PI / 2
      const lightX = centerX + Math.cos(lightAngle) * (radius + 12)
      const lightY = centerY + Math.sin(lightAngle) * (radius + 12)
      
      // Light glow
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

    // Draw outer golden ring
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
      if (segment.isGiftBox) {
        // Gold gradient for gift box segments
        const goldGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        goldGradient.addColorStop(0, '#FFE55C')
        goldGradient.addColorStop(0.5, '#DAA520')
        goldGradient.addColorStop(1, '#B8860B')
        ctx.fillStyle = goldGradient
      } else {
        // Dark gradient for "sigue intentando" segments
        const darkGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
        darkGradient.addColorStop(0, '#2a2a2a')
        darkGradient.addColorStop(1, '#0a0a0a')
        ctx.fillStyle = darkGradient
      }
      ctx.fill()

      // Draw segment border
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw content
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(segmentStart + angle / 2)
      
      const textRadius = radius * 0.68
      
      if (segment.isGiftBox) {
        // Draw gift box icon
        const boxSize = size < 400 ? 18 : 22
        
        // Box body (white)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + 4, boxSize, boxSize * 0.7)
        
        // Box lid
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2 - 2, -boxSize/2, boxSize + 4, boxSize * 0.25)
        
        // Ribbon vertical
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(textRadius - 2, -boxSize/2, 4, boxSize * 0.95)
        
        // Ribbon horizontal  
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + boxSize * 0.35, boxSize, 4)
        
        // Bow circles
        ctx.beginPath()
        ctx.arc(textRadius - 5, -boxSize/2 - 2, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(textRadius + 5, -boxSize/2 - 2, 4, 0, Math.PI * 2)
        ctx.fill()
        
        // Sparkles
        ctx.font = `${size < 400 ? 6 : 8}px Arial`
        ctx.fillStyle = '#FFD700'
        ctx.fillText('✦', textRadius - boxSize/2 - 6, -boxSize/2 + 4)
        ctx.fillText('✦', textRadius + boxSize/2 + 2, -boxSize/2 + 4)
        ctx.fillText('✦', textRadius, -boxSize/2 - 8)
      } else {
        // Draw "SIGUE INTENTANDO" text
        const fontSize = size < 400 ? 7 : 9
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = segment.textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        const lines = segment.label.split('\n')
        const lineHeight = fontSize + 1
        
        lines.forEach((line, lineIndex) => {
          const yOffset = (lineIndex - (lines.length - 1) / 2) * lineHeight
          ctx.fillText(line, textRadius, yOffset)
        })
      }
      
      ctx.restore()
    })

    // Draw center circle background
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

    // Draw logo in center if loaded
    if (logoLoaded && logoRef.current) {
      const logoSize = radius * 0.55
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.28, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(
        logoRef.current,
        centerX - logoSize / 2,
        centerY - logoSize / 2,
        logoSize,
        logoSize
      )
      ctx.restore()
    }

    // Inner ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.32, 0, Math.PI * 2)
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.stroke()

  }, [rotation, isAnimating, logoLoaded])

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
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.02)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.02)
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
        gainNode.gain.setValueAtTime(0.12, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.25)
      })
    } catch {
      // Audio not available
    }
  }, [initAudio])

  // Determine prize based on controlled probability
  const determinePrize = useCallback(async (): Promise<{ premio: Premio; targetSegment: number }> => {
    const nextSpinCount = globalSpinCount + 1
    
    let prizeType: string | null = null
    let prizeName: string = 'Sigue Intentando'
    
    // Check milestones (rarest to most common)
    if (nextSpinCount % 12506 === 0) {
      prizeType = 'motor'
      prizeName = 'Motor'
    } else if (nextSpinCount % 7605 === 0) {
      prizeType = 'iphone'
      prizeName = 'iPhone'
    } else if (nextSpinCount % 3504 === 0) {
      prizeType = 'tech'
      const techPrizes = ['Patineta Electrica', 'PS5', 'Smart TV']
      prizeName = techPrizes[Math.floor(Math.random() * techPrizes.length)]
    } else if (nextSpinCount % 753 === 0) {
      prizeType = 'dinero'
      prizeName = 'RD$5,000'
    } else if (nextSpinCount % 201 === 0) {
      prizeType = 'boleto'
      prizeName = '1 Boleto BMW X6 + 1 Boleto BMW X7'
    }
    
    // Find target segment
    let targetSegment: number
    
    if (prizeType) {
      // Prize - land on a random gift box segment (odd indices)
      const giftBoxIndices = WHEEL_SEGMENTS
        .map((_, i) => i)
        .filter(i => WHEEL_SEGMENTS[i].isGiftBox)
      targetSegment = giftBoxIndices[Math.floor(Math.random() * giftBoxIndices.length)]
    } else {
      // No prize - land on a "SIGUE INTENTANDO" segment (even indices)
      const noWinIndices = WHEEL_SEGMENTS
        .map((_, i) => i)
        .filter(i => !WHEEL_SEGMENTS[i].isGiftBox)
      targetSegment = noWinIndices[Math.floor(Math.random() * noWinIndices.length)]
    }

    // Create premio object
    let premio: Premio
    
    if (prizeType) {
      premio = premios.find(p => p.tipo === 'premio') || {
        id: 'prize-' + prizeType,
        nombre: prizeName,
        tipo: 'premio' as const,
        probabilidad: 1
      }
      premio = { ...premio, nombre: prizeName }
    } else {
      premio = premios.find(p => p.tipo === 'sin_premio') || {
        id: 'no-prize',
        nombre: 'Sigue Intentando',
        tipo: 'sin_premio' as const,
        probabilidad: 100
      }
    }

    return { premio, targetSegment }
  }, [premios, globalSpinCount])

  // Animate the wheel spin
  const spinWheel = useCallback(async () => {
    if (!canSpin || isSpinning || isAnimating) return

    onStartSpin()
    setIsAnimating(true)
    initAudio()

    const { premio, targetSegment } = await determinePrize()
    const isWin = premio.tipo === 'premio'

    // Calculate rotation
    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const segmentMiddle = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    const targetRotation = (fullSpins * 360) + (360 - segmentMiddle)
    
    const startRotation = rotation
    const totalRotation = targetRotation
    const duration = 6000
    const startTime = performance.now()

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      
      const currentRotation = startRotation + totalRotation * easedProgress
      setRotation(currentRotation % 360)

      const speed = (totalRotation / duration) * (1 - progress) * 1000
      if (speed > 50 && Math.random() > 0.7) {
        playTickSound()
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        if (isWin) {
          playWinSound()
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 3000)
        }
        
        setGlobalSpinCount(prev => prev + 1)
        
        fetch('/api/ruleta/spin-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch(console.error)
        
        onSpinComplete(premio)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [canSpin, isSpinning, isAnimating, onStartSpin, determinePrize, rotation, playTickSound, playWinSound, onSpinComplete, initAudio])

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
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(218,165,32,0.4) 0%, transparent 70%)',
          transform: 'scale(1.2)',
        }}
      />

      <div className="relative">
        {/* Pointer at top */}
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

        {/* Canvas wheel */}
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          className="relative z-10 cursor-pointer"
          onClick={() => canSpin && !isSpinning && spinWheel()}
          style={{
            width: `min(${wheelSize}px, 90vw)`,
            height: `min(${wheelSize}px, 90vw)`,
          }}
        />

        {/* Center logo overlay for better quality */}
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

        {/* Win particles */}
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

      {/* Platform/pedestal glow effect */}
      <div className="mt-4 h-4 w-72 rounded-full bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent blur-sm" />
    </div>
  )
}

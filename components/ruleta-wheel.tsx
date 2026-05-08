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
  // Player info for tracking individual spins
  playerTelefono?: string
  playerNombre?: string
  jugadaId?: string
  spinType?: 'pagado' | 'gratis' | 'boleto'
  spinMonto?: number
  spinMoneda?: 'DOP' | 'USD'
}

// ─── DEFINITIVE VISUAL SEGMENT TABLE ──────────────────────────────────────
// This table represents the EXACT visual order as rendered by the canvas.
// The canvas draws segment[i] starting at angle: startAngle + i * angle - π/2
// So segment[0] starts at the TOP (12 o'clock) when rotation = 0.
//
// 'lose' = "SIGUE INTENTANDO" (black segment)
// 'gift' = gift box (gold segment)
// ──────────────────────────────────────────────────────────────────────────
const VISUAL_SEGMENT_MAP: ('lose' | 'gift')[] = [
  'lose', // index 0
  'lose', // index 1
  'lose', // index 2
  'lose', // index 3
  'gift', // index 4  ← gift (1 of 4)
  'lose', // index 5
  'lose', // index 6
  'lose', // index 7
  'lose', // index 8
  'gift', // index 9  ← gift (2 of 4)
  'lose', // index 10
  'lose', // index 11
  'lose', // index 12
  'lose', // index 13
  'gift', // index 14 ← gift (3 of 4)
  'lose', // index 15
  'lose', // index 16
  'lose', // index 17
  'lose', // index 18
  'gift', // index 19 ← gift (4 of 4)
]

// Full segment data for rendering
const WHEEL_SEGMENTS: Array<{
  label: string
  color: string
  textColor: string
  tipo: string
  isGiftBox: boolean
}> = VISUAL_SEGMENT_MAP.map((type) => {
  if (type === 'gift') {
    return {
      label: '',
      color: '#DAA520',
      textColor: '#000000',
      tipo: 'premio',
      isGiftBox: true,
    }
  } else {
    return {
      label: 'SIGUE\nINTENTANDO',
      color: '#1a1a1a',
      textColor: '#DAA520',
      tipo: 'sin_premio',
      isGiftBox: false,
    }
  }
})

const TOTAL_SEGMENTS = WHEEL_SEGMENTS.length // 20
const SEGMENT_ANGLE = 360 / TOTAL_SEGMENTS   // 18°

// ─── DEFINITIVE INVERSE FUNCTIONS ─────────────────────────────────────────
// These two functions MUST be exact mathematical inverses of each other.
// 
// Canvas draws segment[i] with its START edge at angle:
//   canvasAngle = rotation - 90 + i * 18  (in degrees, 0 = right, CCW positive)
//
// The pointer is at the TOP = -90° in canvas coords = 270° in standard coords.
// A segment is "under the pointer" when the pointer falls within its arc.
//
// For the CENTER of segment[i] to be at the pointer:
//   rotation - 90 + i * 18 + 9 = 0  (mod 360, where 0 = top)
//   rotation = 81 - i * 18          (mod 360)
//
// INVERSE: given rotation, which segment's center is at the pointer?
//   i = (81 - rotation) / 18        (mod 20)
// ──────────────────────────────────────────────────────────────────────────

function getExactRotationForIndex(targetIndex: number): number {
  // Returns the rotation (0-360) that centers segment[targetIndex] under pointer
  const rot = (81 - targetIndex * SEGMENT_ANGLE) % 360
  return rot < 0 ? rot + 360 : rot
}

function getVisibleIndexFromRotation(rotationDegrees: number): number {
  // Returns which segment index is centered under the pointer at this rotation
  const normalized = ((rotationDegrees % 360) + 360) % 360
  // Exact inverse of getExactRotationForIndex
  const rawIndex = (81 - normalized) / SEGMENT_ANGLE
  // Use Math.round to snap to nearest segment (handles edge cases)
  const rounded = Math.round(rawIndex)
  // Normalize to [0, 19]
  return ((rounded % TOTAL_SEGMENTS) + TOTAL_SEGMENTS) % TOTAL_SEGMENTS
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
  const [idleRotation, setIdleRotation] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [globalSpinCount, setGlobalSpinCount] = useState(0)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [pulsePhase, setPulsePhase] = useState(0)
  const logoRef = useRef<HTMLImageElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const idleAnimationRef = useRef<number | null>(null)

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

  // Idle rotation animation (slow continuous rotation when not spinning)
  useEffect(() => {
    if (isAnimating) {
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current)
      }
      return
    }

    let lastTime = performance.now()
    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime
      lastTime = currentTime
      
      // Slow rotation: 360 degrees in 60 seconds = 6 degrees per second
      setIdleRotation(prev => (prev + (delta / 1000) * 6) % 360)
      // Pulse animation phase
      setPulsePhase(prev => (prev + delta / 500) % (Math.PI * 2))
      
      idleAnimationRef.current = requestAnimationFrame(animate)
    }
    
    idleAnimationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current)
      }
    }
  }, [isAnimating])

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

    // Draw segments - use idle rotation when not spinning, actual rotation when spinning
    const currentRotation = isAnimating ? rotation : idleRotation
    const startAngle = (currentRotation * Math.PI) / 180
    
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
        // Draw gift box icon with pulse effect (bigger size)
        const baseBoxSize = size < 400 ? 24 : 30
        // Pulse scale between 1.0 and 1.15
        const pulseScale = isAnimating ? 1 : 1 + Math.sin(pulsePhase + index) * 0.15
        const boxSize = baseBoxSize * pulseScale
        
        // Glow effect for gift boxes
        if (!isAnimating) {
          const glowIntensity = 0.3 + Math.sin(pulsePhase + index) * 0.2
          ctx.shadowColor = `rgba(255, 215, 0, ${glowIntensity})`
          ctx.shadowBlur = 15
        }
        
        // Box body (white)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + 5, boxSize, boxSize * 0.7)
        
        // Box lid
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2 - 3, -boxSize/2, boxSize + 6, boxSize * 0.28)
        
        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        
        // Ribbon vertical
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(textRadius - 3, -boxSize/2, 6, boxSize * 0.98)
        
        // Ribbon horizontal  
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + boxSize * 0.38, boxSize, 5)
        
        // Bow circles (bigger)
        ctx.beginPath()
        ctx.arc(textRadius - 7, -boxSize/2 - 3, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(textRadius + 7, -boxSize/2 - 3, 6, 0, Math.PI * 2)
        ctx.fill()
        // Center bow knot
        ctx.beginPath()
        ctx.arc(textRadius, -boxSize/2 - 1, 4, 0, Math.PI * 2)
        ctx.fill()
        
        // Animated sparkles
        const sparkleOffset = Math.sin(pulsePhase * 2 + index) * 3
        ctx.font = `${size < 400 ? 8 : 10}px Arial`
        ctx.fillStyle = '#FFD700'
        ctx.fillText('✦', textRadius - boxSize/2 - 8, -boxSize/2 + 4 + sparkleOffset)
        ctx.fillText('✦', textRadius + boxSize/2 + 4, -boxSize/2 + 4 - sparkleOffset)
        ctx.fillText('✦', textRadius, -boxSize/2 - 12 + sparkleOffset)
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

  }, [rotation, idleRotation, isAnimating, logoLoaded, pulsePhase])

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

  // Determine result: win or lose, and select the exact segment index
  const determineResult = useCallback(async (): Promise<{ premio: Premio; selectedIndex: number }> => {
    // Always fetch the REAL spin count from the server to avoid client drift
    let serverSpinCount = globalSpinCount
    try {
      const res = await fetch('/api/ruleta/spin-count')
      const data = await res.json()
      if (data.count !== undefined) {
        serverSpinCount = data.count
        setGlobalSpinCount(data.count)
      }
    } catch {
      // Fall back to local count
    }

    const nextSpinCount = serverSpinCount + 1

    let prizeType: string | null = null
    let prizeName: string = 'Sigue Intentando'

    // ─── PREMIOS OFICIALES FORTURD ─────────────────────────────────────────
    // Check milestones from rarest to most common (order matters!)
    // Each milestone is REPETITIVE and AUTOMATIC (cycles)
    // ───────────────────────────────────────────────────────────────────────
    if (nextSpinCount % 16207 === 0) {
      prizeType = 'motor'
      prizeName = 'Motor'
    } else if (nextSpinCount % 12506 === 0) {
      prizeType = 'dinero_100k'
      prizeName = 'RD$100,000'
    } else if (nextSpinCount % 8605 === 0) {
      prizeType = 'iphone'
      prizeName = 'iPhone'
    } else if (nextSpinCount % 3504 === 0) {
      prizeType = 'tech'
      const techPrizes = ['Patineta Electrica', 'PS5', 'Smart TV']
      prizeName = techPrizes[Math.floor(Math.random() * techPrizes.length)]
    } else if (nextSpinCount % 211 === 0) {
      prizeType = 'dinero_5k'
      prizeName = 'RD$5,000'
    } else if (nextSpinCount % 71 === 0) {
      prizeType = 'boleto_bmw'
      prizeName = '1 Boleto BMW X6 + 1 Boleto BMW X7'
    } else if (nextSpinCount % 20 === 0) {
      prizeType = 'boleto_eleccion'
      prizeName = '1 Boleto del Sorteo a Eleccion'
    }

    // Index pools matching VISUAL_SEGMENT_MAP (4 gifts, 16 lose)
    const winningIndexes = [4, 9, 14, 19]                                          // gift box segments
    const loseIndexes    = [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18] // "sigue intentando"

    const result = prizeType ? 'win' : 'lose'

    // Select index ONLY from the correct pool — no mixing possible
    const selectedIndex =
      result === 'win'
        ? winningIndexes[Math.floor(Math.random() * winningIndexes.length)]
        : loseIndexes[Math.floor(Math.random() * loseIndexes.length)]

    // Build premio object
    let premio: Premio
    if (prizeType) {
      premio = premios.find(p => p.tipo === 'premio') || {
        id: 'prize-' + prizeType,
        nombre: prizeName,
        tipo: 'premio' as const,
        probabilidad: 1,
      }
      premio = { ...premio, nombre: prizeName }
    } else {
      premio = premios.find(p => p.tipo === 'sin_premio') || {
        id: 'no-prize',
        nombre: 'Sigue Intentando',
        tipo: 'sin_premio' as const,
        probabilidad: 100,
      }
    }

    return { premio, selectedIndex }
  }, [premios, globalSpinCount])

  // Animate the wheel spin
  const spinWheel = useCallback(async () => {
    if (!canSpin || isSpinning || isAnimating) return

    onStartSpin()
    setIsAnimating(true)
    initAudio()

    const { premio, selectedIndex } = await determineResult()
    const isWin = premio.tipo === 'premio'
    const expectedResult: 'lose' | 'gift' = isWin ? 'gift' : 'lose'

    // ─── SIMPLE, BULLETPROOF ROTATION CALCULATION ─────────────────────────
    // 1. The selectedIndex is ALREADY guaranteed to be from the correct pool
    //    (gift indexes for wins, lose indexes for losses) by determineResult()
    // 2. We use getExactRotationForIndex which is mathematically exact
    // 3. We add full spins for visual effect
    // 4. We verify with getVisibleIndexFromRotation (exact inverse function)
    // ──────────────────────────────────────────────────────────────────────
    
    const extraSpins = 360 * 6  // 6 full rotations for visual effect
    const exactBaseRotation = getExactRotationForIndex(selectedIndex)
    let targetRotation = extraSpins + exactBaseRotation
    
    // VERIFICATION: Confirm the math works
    let verifyIndex = getVisibleIndexFromRotation(targetRotation)
    
    // If somehow the index doesn't match (shouldn't happen with exact math),
    // force to the correct segment
    if (verifyIndex !== selectedIndex || VISUAL_SEGMENT_MAP[verifyIndex] !== expectedResult) {
      // Find closest valid index from the correct pool
      const validIndexes = expectedResult === 'gift'
        ? [4, 9, 14, 19]
        : [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
      
      // Use first valid index as fallback
      const fallbackIndex = validIndexes[0]
      targetRotation = extraSpins + getExactRotationForIndex(fallbackIndex)
      verifyIndex = fallbackIndex
    }

    const startRotation = rotation
    const totalRotation = targetRotation

    const duration = 7000 // ms
    const startTime = performance.now()

    // easeOutQuint: fast start, very gradual precise stop
    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 5)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOut(progress)

      const currentRotation = startRotation + totalRotation * easedProgress
      setRotation(currentRotation)

      const speed = (totalRotation / duration) * (1 - progress) * 1000
      if (speed > 50 && Math.random() > 0.7) {
        playTickSound()
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // ─── SNAP FINAL FORZADO ─────────────────────────────────────────────
        // After animation completes, verify alignment and force-snap if needed.
        // Uses the SAME functions as pre-calculation for consistency.
        // ───────────────────────────────────────────────────────────────────
        
        const rawFinalRotation = startRotation + totalRotation
        
        // Use the EXACT same function to determine visible index
        let actualVisibleIndex = getVisibleIndexFromRotation(rawFinalRotation)
        const actualSegmentType = VISUAL_SEGMENT_MAP[actualVisibleIndex]
        
        // Calculate the exact snap rotation
        let snapRotation: number
        
        if (actualSegmentType === expectedResult) {
          // Correct type - just snap to exact center of this segment
          const exactRot = getExactRotationForIndex(actualVisibleIndex)
          const fullSpins = Math.floor(rawFinalRotation / 360) * 360
          snapRotation = fullSpins + exactRot
        } else {
          // MISMATCH - force to nearest valid segment (this should never happen
          // if the pre-calculation is correct, but it's a safety net)
          const validIndexes = expectedResult === 'gift'
            ? [4, 9, 14, 19]
            : [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
          
          // Find closest valid
          let closest = validIndexes[0]
          let minDist = Math.abs(validIndexes[0] - actualVisibleIndex)
          for (const idx of validIndexes) {
            const d = Math.abs(idx - actualVisibleIndex)
            if (d < minDist) { minDist = d; closest = idx }
          }
          
          const exactRot = getExactRotationForIndex(closest)
          const fullSpins = Math.floor(rawFinalRotation / 360) * 360
          snapRotation = fullSpins + exactRot
          actualVisibleIndex = closest
        }
        
        // Apply the exact snap
        setRotation(snapRotation)
        setIsAnimating(false)

        if (isWin) {
          playWinSound()
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 3000)
        }

        setGlobalSpinCount(prev => prev + 1)

        // Record individual spin with player details
        fetch('/api/ruleta/spin-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: playerTelefono,
            nombre: playerNombre,
            tipo: spinType,
            resultado: premio.nombre,
            es_premio: isWin,
            jugada_id: jugadaId,
            monto: spinMonto,
            moneda: spinMoneda
          })
        }).catch(console.error)

        onSpinComplete(premio)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [canSpin, isSpinning, isAnimating, onStartSpin, determineResult, rotation, playTickSound, playWinSound, onSpinComplete, initAudio])

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

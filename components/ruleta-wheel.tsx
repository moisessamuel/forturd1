'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
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

// 12 segments like the image: 6 prizes (gold with gift), 6 "sigue intentando" (black)
const TOTAL_SEGMENTS = 12
const SEGMENT_ANGLE = 360 / TOTAL_SEGMENTS

export function RuletaWheel({ 
  premios, 
  onSpinComplete, 
  canSpin, 
  isSpinning,
  onStartSpin 
}: RuletaWheelProps) {
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
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.05)
    } catch (e) {
      console.log('Audio not available')
    }
  }, [initAudio])

  // Play win sound
  const playWinSound = useCallback(() => {
    try {
      const ctx = initAudio()
      const notes = [523.25, 659.25, 783.99, 1046.50]
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        
        const startTime = ctx.currentTime + i * 0.15
        gainNode.gain.setValueAtTime(0.2, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
      })
    } catch (e) {
      console.log('Audio not available')
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

  // Determine prize based on weighted probability
  const determinePrize = useCallback((): Premio => {
    const totalProbability = premios.reduce((sum, p) => sum + p.probabilidad, 0)
    let random = Math.random() * totalProbability
    
    for (const premio of premios) {
      random -= premio.probabilidad
      if (random <= 0) {
        return premio
      }
    }
    
    return premios.find(p => p.tipo === 'sin_premio') || premios[premios.length - 1]
  }, [premios])

  // Handle spin
  const spinWheel = useCallback(() => {
    if (!canSpin || isSpinning) return

    onStartSpin()
    initAudio()

    const prize = determinePrize()
    const isWin = prize.tipo === 'premio'
    
    // Calculate target segment (alternating: 0,2,4,6,8,10 = black/sin_premio, 1,3,5,7,9,11 = gold/premio)
    // In the image, gold segments have gifts (prizes), black segments say "sigue intentando"
    let targetSegment: number
    if (isWin) {
      // Prize segments (gold with gifts): 1, 3, 5, 7, 9, 11
      const prizeSegments = [1, 3, 5, 7, 9, 11]
      targetSegment = prizeSegments[Math.floor(Math.random() * prizeSegments.length)]
    } else {
      // "Sigue intentando" segments (black): 0, 2, 4, 6, 8, 10
      const noWinSegments = [0, 2, 4, 6, 8, 10]
      targetSegment = noWinSegments[Math.floor(Math.random() * noWinSegments.length)]
    }

    // Calculate rotation to land on target segment
    // The pointer is at the top (12 o'clock position)
    const currentTotal = rotation
    const fullSpins = 8 + Math.floor(Math.random() * 4) // 8-11 full spins
    const targetAngle = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    // We need to rotate so that the target segment ends up at the top (where pointer is)
    const finalRotation = currentTotal + (fullSpins * 360) + (360 - targetAngle + 90)
    
    const duration = 6000 + Math.random() * 2000 // 6-8 seconds

    animateSpin(finalRotation, duration, () => {
      if (isWin) {
        playWinSound()
        setShowParticles(true)
        setTimeout(() => setShowParticles(false), 3000)
      }
      onSpinComplete(prize)
    })
  }, [canSpin, isSpinning, onStartSpin, determinePrize, rotation, animateSpin, playWinSound, onSpinComplete, initAudio])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="relative flex flex-col items-center">
      {/* Glow effect behind wheel */}
      <div 
        className="absolute inset-0 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(218,165,32,0.4) 0%, transparent 70%)',
          transform: 'scale(1.2)',
        }}
      />

      {/* Main wheel container */}
      <div className="relative">
        {/* Fixed pointer at top - outside the rotating wheel */}
        <div 
          className="absolute left-1/2 -top-2 z-20 -translate-x-1/2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(218,165,32,0.8))' }}
        >
          <div 
            className="h-0 w-0"
            style={{
              borderLeft: '20px solid transparent',
              borderRight: '20px solid transparent',
              borderTop: '35px solid #DAA520',
            }}
          />
        </div>

        {/* Rotating wheel image */}
        <div
          className="relative transition-none"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            width: 'min(400px, 90vw)',
            height: 'min(400px, 90vw)',
          }}
        >
          <Image
            src="/images/ruleta-forturd.png"
            alt="Ruleta FortuRD"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Sparkle particles on win */}
        {showParticles && (
          <div className="pointer-events-none absolute inset-0 z-30">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
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
        {isSpinning && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-full">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-full w-1 origin-bottom -translate-x-1/2 bg-gradient-to-t from-transparent via-yellow-400/30 to-transparent"
                style={{
                  transform: `translateX(-50%) rotate(${i * 45}deg)`,
                  animation: `pulse 0.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spin button */}
      <div className="mt-8">
        {canSpin && !isSpinning ? (
          <Button
            onClick={spinWheel}
            className={`relative h-16 w-64 overflow-hidden bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-xl font-bold text-black transition-all hover:scale-105 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 ${
              pulseButton ? 'shadow-[0_0_30px_rgba(218,165,32,0.8)]' : 'shadow-[0_0_15px_rgba(218,165,32,0.5)]'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              PRESIONA AQUI
              <Sparkles className="h-6 w-6" />
            </span>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: 'shimmer 2s infinite',
                transform: 'translateX(-100%)',
              }}
            />
          </Button>
        ) : isSpinning ? (
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

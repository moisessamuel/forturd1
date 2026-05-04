'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
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

const SEGMENTS = 12

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
  const [glowIntensity, setGlowIntensity] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const tickSoundRef = useRef<OscillatorNode | null>(null)

  // Pulsing animation for button when can spin
  useEffect(() => {
    if (canSpin && !isSpinning) {
      const interval = setInterval(() => {
        setPulseButton(prev => !prev)
      }, 800)
      return () => clearInterval(interval)
    }
  }, [canSpin, isSpinning])

  // Glow animation during spin
  useEffect(() => {
    if (isSpinning) {
      const interval = setInterval(() => {
        setGlowIntensity(prev => (prev + 1) % 100)
      }, 50)
      return () => clearInterval(interval)
    }
  }, [isSpinning])

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
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.05)
    } catch (e) {
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
        gainNode.gain.setValueAtTime(0.2, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.4)
      })
    } catch (e) {
      // Audio not supported
    }
  }, [initAudio])

  // Play spinning sound with tick intervals
  const playSpinningSound = useCallback(() => {
    let tickCount = 0
    const maxTicks = 50
    
    const tick = () => {
      if (tickCount < maxTicks) {
        playTickSound()
        tickCount++
        // Slow down ticks as wheel slows
        const delay = 50 + (tickCount * tickCount * 0.8)
        setTimeout(tick, Math.min(delay, 500))
      }
    }
    
    tick()
  }, [playTickSound])

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

  // Map prize type to segment on the wheel image
  const getSegmentAngle = (isPrize: boolean): number => {
    const prizeAngles = [30, 90, 150, 210, 270, 330]
    const noPrizeAngles = [0, 60, 120, 180, 240, 300]
    
    const angles = isPrize ? prizeAngles : noPrizeAngles
    const randomIndex = Math.floor(Math.random() * angles.length)
    return angles[randomIndex]
  }

  const spinWheel = () => {
    if (!canSpin || isSpinning) return

    onStartSpin()
    playSpinningSound()
    
    // Select prize based on probability
    const prize = selectPrizeByProbability()
    const isPrize = prize.tipo === 'premio'
    
    // Get target angle based on prize type
    const targetAngle = getSegmentAngle(isPrize)
    
    // Add multiple full rotations + offset to land on the correct segment
    const spins = 6 + Math.random() * 4 // 6-10 full spins
    const finalRotation = rotation + (spins * 360) + (360 - targetAngle)
    
    setRotation(finalRotation)

    // After animation completes, trigger callback
    setTimeout(() => {
      if (isPrize) {
        setShowParticles(true)
        playWinSound()
        setTimeout(() => setShowParticles(false), 3000)
      }
      onSpinComplete(prize)
    }, 5500)
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow effect */}
      <div 
        className="pointer-events-none absolute -inset-10 z-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(218,165,32,${isSpinning ? 0.3 + (glowIntensity / 200) : 0.15}) 0%, transparent 60%)`,
          transition: 'all 0.1s',
        }}
      />

      {/* Particle effects when winning */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {[...Array(30)].map((_, i) => (
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
                  fontSize: `${12 + Math.random() * 24}px`,
                  filter: 'drop-shadow(0 0 6px gold)',
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {/* Light rays during spin */}
      {isSpinning && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-[300px] w-2 origin-bottom -translate-x-1/2 animate-pulse"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                background: 'linear-gradient(to top, rgba(218,165,32,0.5), transparent)',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Wheel Container */}
      <div className="relative">
        {/* Outer glow ring */}
        <div 
          className={`absolute -inset-4 rounded-full transition-all duration-300 ${isSpinning ? 'animate-pulse' : ''}`}
          style={{
            background: `radial-gradient(circle, transparent 45%, rgba(218,165,32,${isSpinning ? 0.6 : 0.3}) 50%, transparent 55%)`,
            filter: isSpinning ? 'blur(8px)' : 'blur(4px)',
          }}
        />

        {/* Spinning wheel image */}
        <div
          ref={wheelRef}
          className={`relative z-20 ${isSpinning ? '' : 'hover:scale-[1.02]'} transition-transform`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '5.5s' : '0.3s',
            transitionTimingFunction: isSpinning 
              ? 'cubic-bezier(0.15, 0.60, 0.20, 1.00)' 
              : 'ease-out',
            filter: isSpinning 
              ? `drop-shadow(0 0 ${20 + (glowIntensity / 5)}px rgba(218,165,32,0.8))` 
              : 'drop-shadow(0 0 15px rgba(218,165,32,0.5))',
          }}
        >
          <Image
            src="/images/ruleta-forturd.png"
            alt="Ruleta FortuRD"
            width={500}
            height={500}
            className="h-[320px] w-[320px] object-contain md:h-[450px] md:w-[450px] lg:h-[500px] lg:w-[500px]"
            priority
          />
        </div>

        {/* Pointer highlight effect */}
        <div 
          className={`absolute left-1/2 top-0 z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 ${isSpinning ? 'animate-bounce' : ''}`}
          style={{
            filter: 'drop-shadow(0 0 10px gold)',
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
            {canSpin ? 'GIRAR RULETA' : 'COMPRA PARA GIRAR'}
          </span>
        )}
      </Button>

      {/* Decorative sparkles around button when can spin */}
      {canSpin && !isSpinning && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute animate-pulse text-yellow-400"
              style={{
                left: `${-80 + i * 32}px`,
                top: `${Math.sin(i) * 10 - 20}px`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.7,
              }}
              size={16}
            />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Gift } from 'lucide-react'

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

// The wheel image has 12 segments alternating prize/no-prize
// Starting from top going clockwise:
// 1. Sin premio (black) - 0 degrees
// 2. Premio (gold) - 30 degrees
// 3. Sin premio (black) - 60 degrees
// etc.
const SEGMENTS = 12
const SEGMENT_ANGLE = 360 / SEGMENTS

export function RuletaWheel({ 
  premios, 
  onSpinComplete, 
  canSpin, 
  isSpinning,
  onStartSpin 
}: RuletaWheelProps) {
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)

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
  // Gold segments (prizes): positions 1, 3, 5, 7, 9, 11 (30, 90, 150, 210, 270, 330 degrees)
  // Black segments (no prize): positions 0, 2, 4, 6, 8, 10 (0, 60, 120, 180, 240, 300 degrees)
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
    
    // Select prize based on probability
    const prize = selectPrizeByProbability()
    const isPrize = prize.tipo === 'premio'
    
    // Get target angle based on prize type
    const targetAngle = getSegmentAngle(isPrize)
    
    // Add multiple full rotations + offset to land on the correct segment
    // The pointer is at the top (0 degrees), so we need to rotate to bring the target segment to the top
    const spins = 5 + Math.random() * 3 // 5-8 full spins
    const finalRotation = rotation + (spins * 360) + (360 - targetAngle)
    
    setRotation(finalRotation)

    // After animation completes, trigger callback
    setTimeout(() => {
      onSpinComplete(prize)
    }, 5000)
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel Container with the actual image */}
      <div className="relative">
        {/* Sparkle effects */}
        <div 
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(218,165,32,0.1) 0%, transparent 60%)',
          }}
        />

        {/* Spinning wheel image */}
        <div
          ref={wheelRef}
          className="relative transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '5s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
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
      </div>

      {/* Spin button */}
      <Button
        onClick={spinWheel}
        disabled={!canSpin || isSpinning}
        className="mt-8 h-14 w-64 bg-gradient-to-r from-primary to-yellow-500 text-lg font-bold text-black transition-all hover:scale-105 hover:from-yellow-500 hover:to-primary disabled:opacity-50"
        style={{
          boxShadow: canSpin && !isSpinning ? '0 0 30px rgba(218,165,32,0.6)' : 'none',
        }}
      >
        {isSpinning ? (
          <span className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
            GIRANDO...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {canSpin ? 'GIRAR RULETA' : 'COMPRA PARA GIRAR'}
          </span>
        )}
      </Button>
    </div>
  )
}

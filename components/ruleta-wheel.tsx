'use client'

import { useState, useRef, useEffect } from 'react'
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

export function RuletaWheel({ 
  premios, 
  onSpinComplete, 
  canSpin, 
  isSpinning,
  onStartSpin 
}: RuletaWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [selectedPrize, setSelectedPrize] = useState<Premio | null>(null)
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

  const spinWheel = () => {
    if (!canSpin || isSpinning) return

    onStartSpin()
    
    // Select prize based on probability
    const prize = selectPrizeByProbability()
    setSelectedPrize(prize)

    // Calculate rotation to land on selected prize
    const prizeIndex = premios.findIndex(p => p.id === prize.id)
    const segmentAngle = 360 / premios.length
    const prizeAngle = prizeIndex * segmentAngle
    
    // Add multiple full rotations + offset to land on prize
    const spins = 5 + Math.random() * 3 // 5-8 full spins
    const finalRotation = rotation + (spins * 360) + (360 - prizeAngle) + (segmentAngle / 2)
    
    setRotation(finalRotation)

    // After animation completes, trigger callback
    setTimeout(() => {
      onSpinComplete(prize)
    }, 5000)
  }

  // Generate wheel segments
  const segmentAngle = 360 / premios.length

  return (
    <div className="relative flex flex-col items-center">
      {/* Pointer/Arrow at top */}
      <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
        <div 
          className="h-0 w-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg"
          style={{ filter: 'drop-shadow(0 0 10px rgba(218,165,32,0.8))' }}
        />
      </div>

      {/* Wheel Container */}
      <div className="relative h-[320px] w-[320px] md:h-[400px] md:w-[400px]">
        {/* Outer glow ring */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(218,165,32,0.3) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Wheel border with lights effect */}
        <div 
          className="absolute inset-0 rounded-full border-8 border-primary"
          style={{
            boxShadow: '0 0 30px rgba(218,165,32,0.6), inset 0 0 30px rgba(218,165,32,0.3)',
          }}
        />

        {/* Spinning wheel */}
        <div
          ref={wheelRef}
          className="absolute inset-2 rounded-full overflow-hidden transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '5s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
          }}
        >
          {/* SVG Wheel segments */}
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {premios.map((premio, index) => {
              const startAngle = index * segmentAngle
              const endAngle = (index + 1) * segmentAngle
              const startRad = (startAngle - 90) * (Math.PI / 180)
              const endRad = (endAngle - 90) * (Math.PI / 180)
              
              const x1 = 50 + 50 * Math.cos(startRad)
              const y1 = 50 + 50 * Math.sin(startRad)
              const x2 = 50 + 50 * Math.cos(endRad)
              const y2 = 50 + 50 * Math.sin(endRad)
              
              const largeArc = segmentAngle > 180 ? 1 : 0
              const isWinning = premio.tipo === 'premio'
              
              return (
                <g key={premio.id}>
                  <path
                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={isWinning ? '#DAA520' : '#1a1a1a'}
                    stroke="#333"
                    strokeWidth="0.5"
                  />
                  {/* Text label */}
                  <text
                    x="50"
                    y="20"
                    textAnchor="middle"
                    fontSize="3.5"
                    fontWeight="bold"
                    fill={isWinning ? '#000' : '#DAA520'}
                    transform={`rotate(${startAngle + segmentAngle / 2}, 50, 50)`}
                  >
                    {premio.tipo === 'sin_premio' ? 'SIGUE' : ''}
                  </text>
                  <text
                    x="50"
                    y="24"
                    textAnchor="middle"
                    fontSize="3"
                    fontWeight="bold"
                    fill={isWinning ? '#000' : '#DAA520'}
                    transform={`rotate(${startAngle + segmentAngle / 2}, 50, 50)`}
                  >
                    {premio.tipo === 'sin_premio' ? 'INTENTANDO' : premio.nombre.substring(0, 10)}
                  </text>
                  {/* Gift icon indicator for prizes */}
                  {isWinning && (
                    <circle
                      cx="50"
                      cy="15"
                      r="4"
                      fill="white"
                      transform={`rotate(${startAngle + segmentAngle / 2}, 50, 50)`}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Center logo */}
        <div 
          className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-primary bg-background md:h-28 md:w-28"
          style={{
            boxShadow: '0 0 20px rgba(218,165,32,0.8)',
          }}
        >
          <Image
            src="/images/forturd-logo-zeus.png"
            alt="FortuRD"
            width={100}
            height={100}
            className="h-20 w-20 object-contain mix-blend-lighten md:h-24 md:w-24"
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

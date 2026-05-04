'use client'

import { useEffect, useRef, useState } from 'react'

// 20 segments: 14 black "SIGUE INTENTANDO" and 6 gold "gift box"
const giftBoxPositions = [2, 5, 8, 11, 14, 17]

export function MiniRuletaPreview({ size = 200 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [pulsePhase, setPulsePhase] = useState(0)
  const animationRef = useRef<number | null>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const logoRef = useRef<HTMLImageElement | null>(null)

  // Load logo
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      logoRef.current = img
      setLogoLoaded(true)
    }
    img.src = '/images/forturd-logo.jpeg'
  }, [])

  // Continuous rotation animation
  useEffect(() => {
    let lastTime = performance.now()
    
    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime
      lastTime = currentTime
      
      // Rotate 8 degrees per second
      setRotation(prev => (prev + (delta / 1000) * 8) % 360)
      // Pulse phase for gift boxes
      setPulsePhase(prev => (prev + delta / 400) % (Math.PI * 2))
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 8 // Leave space for outer glow
    
    // Clear
    ctx.clearRect(0, 0, size, size)
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.9, centerX, centerY, radius * 1.1)
    glowGradient.addColorStop(0, 'rgba(218, 165, 32, 0.4)')
    glowGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 1.1, 0, Math.PI * 2)
    ctx.fill()
    
    // Golden frame
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    const frameGradient = ctx.createLinearGradient(0, 0, size, size)
    frameGradient.addColorStop(0, '#FFD700')
    frameGradient.addColorStop(0.5, '#DAA520')
    frameGradient.addColorStop(1, '#B8860B')
    ctx.strokeStyle = frameGradient
    ctx.lineWidth = 6
    ctx.stroke()
    
    // Draw segments
    const segmentCount = 20
    const angle = (Math.PI * 2) / segmentCount
    const startAngle = (rotation * Math.PI) / 180
    const innerRadius = radius - 6
    
    for (let i = 0; i < segmentCount; i++) {
      const segmentStart = startAngle + i * angle
      const isGiftBox = giftBoxPositions.includes(i)
      
      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, innerRadius, segmentStart, segmentStart + angle)
      ctx.closePath()
      ctx.fillStyle = isGiftBox ? '#DAA520' : '#1a1a1a'
      ctx.fill()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 0.5
      ctx.stroke()
      
      // Draw content
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(segmentStart + angle / 2)
      
      const textRadius = innerRadius * 0.68
      
      if (isGiftBox) {
        // Gift box with pulse
        const pulseScale = 1 + Math.sin(pulsePhase + i) * 0.12
        const boxSize = 14 * pulseScale
        
        // Glow
        ctx.shadowColor = `rgba(255, 215, 0, ${0.4 + Math.sin(pulsePhase + i) * 0.3})`
        ctx.shadowBlur = 8
        
        // Box body
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + 3, boxSize, boxSize * 0.7)
        
        // Lid
        ctx.fillRect(textRadius - boxSize/2 - 2, -boxSize/2, boxSize + 4, boxSize * 0.28)
        
        ctx.shadowBlur = 0
        
        // Ribbons
        ctx.fillStyle = '#FFD700'
        ctx.fillRect(textRadius - 2, -boxSize/2, 4, boxSize * 0.95)
        ctx.fillRect(textRadius - boxSize/2, -boxSize/2 + boxSize * 0.38, boxSize, 3)
        
        // Bow
        ctx.beginPath()
        ctx.arc(textRadius - 4, -boxSize/2 - 2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(textRadius + 4, -boxSize/2 - 2, 3, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Text "SIGUE INTENTANDO"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = 'bold 5px Arial'
        ctx.fillStyle = '#DAA520'
        ctx.fillText('SIGUE', textRadius, -3)
        ctx.fillText('INTENTANDO', textRadius, 3)
      }
      
      ctx.restore()
    }
    
    // Decorative lights around the frame
    const lightCount = 24
    for (let i = 0; i < lightCount; i++) {
      const lightAngle = (i / lightCount) * Math.PI * 2 - Math.PI / 2
      const lightX = centerX + Math.cos(lightAngle) * (radius + 2)
      const lightY = centerY + Math.sin(lightAngle) * (radius + 2)
      
      const brightness = 0.6 + Math.sin(pulsePhase * 2 + i * 0.5) * 0.4
      ctx.beginPath()
      ctx.arc(lightX, lightY, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 215, 0, ${brightness})`
      ctx.fill()
    }
    
    // Center hub
    const hubRadius = innerRadius * 0.32
    
    // Hub border
    ctx.beginPath()
    ctx.arc(centerX, centerY, hubRadius + 3, 0, Math.PI * 2)
    ctx.fillStyle = '#DAA520'
    ctx.fill()
    
    // Hub background
    ctx.beginPath()
    ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0a0a'
    ctx.fill()
    
    // Draw logo
    if (logoLoaded && logoRef.current) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(centerX, centerY, hubRadius - 2, 0, Math.PI * 2)
      ctx.clip()
      
      const logoSize = hubRadius * 2
      ctx.drawImage(
        logoRef.current,
        centerX - logoSize / 2,
        centerY - logoSize / 2,
        logoSize,
        logoSize
      )
      ctx.restore()
    }
    
  }, [rotation, pulsePhase, size, logoLoaded])

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow effect */}
      <div 
        className="absolute rounded-full opacity-50 blur-xl"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: 'radial-gradient(circle, rgba(218, 165, 32, 0.4) 0%, transparent 70%)',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10"
      />
    </div>
  )
}

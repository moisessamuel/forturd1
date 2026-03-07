'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'
import { PurchaseFlow } from '@/components/purchase-flow'

export default function HomePage() {
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false)
  const [initialQuantity, setInitialQuantity] = useState(1)
  const [referralCode, setReferralCode] = useState('')

  const handleStartPurchase = (quantity: number, referral?: string) => {
    setInitialQuantity(quantity)
    setReferralCode(referral || '')
    setShowPurchaseFlow(true)
  }

  const handleClosePurchase = () => {
    setShowPurchaseFlow(false)
    setInitialQuantity(1)
    setReferralCode('')
  }

  return (
    <main className="relative min-h-screen abstract-bg">
      {/* Background image */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25"
      >
        <div
          className="h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/images/forturd-bg.png)',
            filter: 'blur(2px)',
            transform: 'scale(0.85)',
            clipPath: 'inset(0 0 6% 0)',
          }}
        />
      </div>
      <div className="relative z-10">
      <Header />
      {!showPurchaseFlow ? (
        <HeroSection onStartPurchase={handleStartPurchase} />
      ) : (
        <PurchaseFlow 
          initialQuantity={initialQuantity} 
          referralCode={referralCode}
          onClose={handleClosePurchase}
        />
      )}
      </div>
    </main>
  )
}

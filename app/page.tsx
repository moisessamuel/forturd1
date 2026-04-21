import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'

export default function HomePage() {
  return (
    <main className="relative min-h-screen abstract-bg">
      {/* Background image */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-25"
      >
        <div
          className="h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/images/forturd-bg-new.jpeg)',
            filter: 'blur(2px)',
            transform: 'scale(0.85)',
            clipPath: 'inset(0 0 6% 0)',
          }}
        />
      </div>
      <div className="relative z-10">
        <Header />
        <HeroSection />
      </div>
    </main>
  )
}

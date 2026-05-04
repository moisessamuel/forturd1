'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, Phone, Search } from 'lucide-react'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 border-b border-border/50 backdrop-blur-md transition-all duration-300 ease-in-out ${scrolled ? 'bg-background/95 shadow-lg shadow-black/20' : 'bg-background/80'}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 ease-in-out ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/forturd-logo-zeus.png"
            alt="FortuRD"
            width={200}
            height={80}
            style={{ width: 'auto', height: scrolled ? '50px' : '70px' }}
            className="object-contain transition-all duration-300 ease-in-out"
          />
        </Link>

        {/* BMW Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="animate-pulse-glow flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-background transition-all hover:border-primary hover:shadow-[0_0_24px_rgba(218,165,32,0.6)]"
            aria-label="Menu"
          >
            <Image
              src="/images/bmw-menu.png"
              alt="Menu"
              width={48}
              height={48}
              className="h-11 w-11 object-contain invert mix-blend-screen"
            />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl shadow-black/30">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Home className="h-5 w-5" />
                <span className="text-base font-medium">Inicio</span>
              </Link>
              <div className="mx-4 border-t border-border/30" />
              <Link
                href="/verificar"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Search className="h-5 w-5" />
                <span className="text-base font-medium">Verifica tu Boleto</span>
              </Link>
              <div className="mx-4 border-t border-border/30" />
              <a
                href="https://wa.me/18092725841"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Phone className="h-5 w-5" />
                <span className="text-base font-medium">Contacto</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

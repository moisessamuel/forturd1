'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const MANUAL_KEY = 'forturd-theme-manual'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(MANUAL_KEY, '1')
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Activar modo día' : 'Activar modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      className="relative flex h-10 w-20 items-center rounded-full border border-border bg-secondary p-1 transition-all duration-500 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{
        boxShadow: isDark
          ? '0 0 12px rgba(218,165,32,0.2), inset 0 1px 2px rgba(0,0,0,0.4)'
          : '0 0 12px rgba(255,193,7,0.3), inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      {/* Track icons */}
      <span className="absolute left-2 text-sm" aria-hidden>🌙</span>
      <span className="absolute right-2 text-sm" aria-hidden>☀️</span>

      {/* Sliding knob */}
      <span
        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-base transition-all duration-500 ease-in-out"
        style={{
          transform: isDark ? 'translateX(0px)' : 'translateX(40px)',
          background: isDark
            ? 'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.6 0.12 75))'
            : 'linear-gradient(135deg, oklch(0.85 0.18 85), oklch(0.75 0.2 80))',
          boxShadow: isDark
            ? '0 0 10px rgba(218,165,32,0.6), 0 2px 4px rgba(0,0,0,0.5)'
            : '0 0 14px rgba(255,193,7,0.7), 0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <span className="text-xs">{isDark ? '🌙' : '☀️'}</span>
      </span>
    </button>
  )
}

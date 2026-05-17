'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const MANUAL_KEY = 'forturd-theme-manual'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-11 w-24 rounded-full bg-secondary animate-pulse" />

  const isDark = theme === 'dark'

  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(MANUAL_KEY, '1')
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Activar modo dia' : 'Activar modo noche'}
      title={isDark ? 'Cambiar a modo dia' : 'Cambiar a modo noche'}
      className="relative flex h-11 w-24 items-center rounded-full border-2 border-primary/60 bg-secondary p-1 transition-all duration-500 hover:border-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{
        boxShadow: isDark
          ? '0 0 14px rgba(218,165,32,0.3), inset 0 1px 3px rgba(0,0,0,0.5)'
          : '0 0 14px rgba(255,193,7,0.4), inset 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Track icons */}
      <Moon className="absolute left-2 h-4 w-4 text-muted-foreground" aria-hidden />
      <Sun className="absolute right-2 h-4 w-4 text-muted-foreground" aria-hidden />

      {/* Sliding knob */}
      <span
        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-in-out"
        style={{
          transform: isDark ? 'translateX(0px)' : 'translateX(44px)',
          background: isDark
            ? 'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.6 0.12 75))'
            : 'linear-gradient(135deg, oklch(0.88 0.2 85), oklch(0.75 0.18 80))',
          boxShadow: isDark
            ? '0 0 12px rgba(218,165,32,0.7), 0 2px 6px rgba(0,0,0,0.5)'
            : '0 0 14px rgba(255,193,7,0.8), 0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {isDark
          ? <Moon className="h-4 w-4 text-background" />
          : <Sun className="h-4 w-4 text-background" />
        }
      </span>
    </button>
  )
}

'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const MANUAL_KEY = 'forturd-theme-manual'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-10 w-20 rounded-full bg-secondary" />

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
      title={isDark ? 'Modo dia' : 'Modo noche'}
      className="relative flex h-9 w-[4.5rem] items-center rounded-full border border-border bg-secondary p-1 transition-all duration-500 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
      style={{
        boxShadow: isDark
          ? '0 0 10px rgba(218,165,32,0.15), inset 0 1px 2px rgba(0,0,0,0.4)'
          : '0 0 10px rgba(255,193,7,0.25), inset 0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      {/* Track icons */}
      <Moon className="absolute left-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <Sun className="absolute right-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />

      {/* Sliding knob */}
      <span
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-500 ease-in-out"
        style={{
          transform: isDark ? 'translateX(0px)' : 'translateX(36px)',
          background: isDark
            ? 'linear-gradient(135deg, oklch(0.75 0.15 85), oklch(0.6 0.12 75))'
            : 'linear-gradient(135deg, oklch(0.85 0.18 85), oklch(0.75 0.2 80))',
          boxShadow: isDark
            ? '0 0 8px rgba(218,165,32,0.5), 0 2px 4px rgba(0,0,0,0.5)'
            : '0 0 10px rgba(255,193,7,0.6), 0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {isDark
          ? <Moon className="h-3.5 w-3.5 text-background" />
          : <Sun className="h-3.5 w-3.5 text-background" />
        }
      </span>
    </button>
  )
}

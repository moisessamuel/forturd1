'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

const MANUAL_KEY = 'forturd-theme-manual'
const STORAGE_KEY = 'forturd-theme'

/** Even months (0,2,4…) → dark | Odd months (1,3,5…) → light */
function getMonthlyTheme(): 'dark' | 'light' {
  return new Date().getMonth() % 2 === 0 ? 'dark' : 'light'
}

function resolveInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  const isManual = localStorage.getItem(MANUAL_KEY) === '1'
  const saved = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null
  if (isManual && (saved === 'dark' || saved === 'light')) return saved
  const monthly = getMonthlyTheme()
  localStorage.setItem(STORAGE_KEY, monthly)
  return monthly
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey={STORAGE_KEY}
      themes={['dark', 'light']}
      scriptProps={{ 'data-cfasync': 'false' }}
    >
      <ThemeBootstrap />
      {children}
    </NextThemesProvider>
  )
}

/** Runs once on mount to enforce monthly rotation when no manual choice exists */
function ThemeBootstrap() {
  const [done, setDone] = React.useState(false)

  React.useEffect(() => {
    if (done) return
    setDone(true)
    const isManual = localStorage.getItem(MANUAL_KEY) === '1'
    if (isManual) return
    const monthly = getMonthlyTheme()
    // Apply class directly to avoid waiting for next-themes re-render
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(monthly)
    localStorage.setItem(STORAGE_KEY, monthly)
  }, [done])

  return null
}

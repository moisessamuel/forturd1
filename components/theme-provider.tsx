'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

const MANUAL_KEY = 'forturd-theme-manual'
const STORAGE_KEY = 'forturd-theme'

/** Even months (0,2,4…) → dark | Odd months (1,3,5…) → light */
function getMonthlyTheme(): 'dark' | 'light' {
  return new Date().getMonth() % 2 === 0 ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [defaultTheme, setDefaultTheme] = React.useState<'dark' | 'light'>('dark')

  React.useEffect(() => {
    const isManual = localStorage.getItem(MANUAL_KEY) === '1'
    const saved = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | null

    if (isManual && saved) {
      setDefaultTheme(saved)
    } else {
      const monthly = getMonthlyTheme()
      setDefaultTheme(monthly)
      localStorage.setItem(STORAGE_KEY, monthly)
    }
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={false}
      storageKey={STORAGE_KEY}
      themes={['dark', 'light']}
    >
      {children}
    </NextThemesProvider>
  )
}

'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

const STORAGE_KEY = 'forturd-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Force light mode on every fresh page load by clearing stored preference
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Only apply if no preference has been set this session
    if (!sessionStorage.getItem('theme-chosen')) {
      localStorage.setItem(STORAGE_KEY, 'light')
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else if (stored) {
      document.documentElement.classList.remove('dark', 'light')
      document.documentElement.classList.add(stored)
    }
  }, [])

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey={STORAGE_KEY}
      themes={['dark', 'light']}
      forcedTheme={undefined}
    >
      {children}
    </NextThemesProvider>
  )
}

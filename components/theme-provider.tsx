'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

const STORAGE_KEY = 'forturd-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey={STORAGE_KEY}
      themes={['dark', 'light']}
      scriptProps={{ 'data-cfasync': 'false' }}
    >
      {children}
    </NextThemesProvider>
  )
}

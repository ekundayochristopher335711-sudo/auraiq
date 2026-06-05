'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

const LS_KEY = 'auraiq-theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  // On mount — read from localStorage, then try Supabase
  useEffect(() => {
    let localTheme: Theme | null = null
    try {
      const raw = localStorage.getItem(LS_KEY) as Theme | null
      if (raw === 'light' || raw === 'dark' || raw === 'system') localTheme = raw
    } catch { /* ignore */ }

    if (localTheme) setThemeState(localTheme)

    // Try to read user preference from Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('theme').eq('id', user.id).single()
        .then(({ data, error }) => {
          if (error) return
          const dbTheme = (data as any)?.theme as Theme | undefined
          if (dbTheme === 'light' || dbTheme === 'dark' || dbTheme === 'system') {
            setThemeState(dbTheme)
          }
        })
    }).catch(() => { /* not signed in */ })
  }, [])

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement
    const apply = (t: Theme) => {
      if (t === 'system') {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
      } else {
        root.classList.toggle('dark', t === 'dark')
      }
    }
    apply(theme)
    try {
      if (theme === 'system') localStorage.removeItem(LS_KEY)
      else localStorage.setItem(LS_KEY, theme)
    } catch { /* ignore */ }
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    // Persist to Supabase (best-effort, no await)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').update({ theme: t } as any).eq('id', user.id).then(() => {})
    }).catch(() => { /* ignore */ })
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

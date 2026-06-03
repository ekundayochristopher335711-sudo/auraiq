'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeProvider'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const cycle = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  return (
    <button
      onClick={cycle}
      className="fixed top-4 right-4 z-50 rounded-md border px-3 py-1 bg-white text-black dark:bg-gray-800 dark:text-white"
      aria-label="Toggle theme"
      title="Toggle theme (cycles: dark → light → system)"
    >
      {theme === 'dark' ? '🌙' : theme === 'light' ? '🔆' : '⌁'}
    </button>
  )
}
